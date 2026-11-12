type LogLevel = "debug" | "info" | "warn" | "error";
type Context = Record<string, unknown>;

const priority: Record<LogLevel, number> = {
  debug: 10,
  info: 20,
  warn: 30,
  error: 40,
};

type ErrorDetails = Error & {
  code?: unknown;
  severity?: unknown;
};

const redacted = "[REDACTED]";
const sensitiveKey =
  /(address|authorization|cookie|credential|databaseurl|email|formdata|name|passphrase|password|phone|privatekey|requestbody|secret|setupurl|token|useragent)/i;

function sanitizeText(value: string) {
  return value
    .replace(/([a-z][a-z0-9+.-]*:\/\/)[^/\s:@]+:[^@\s/]+@/gi, `$1${redacted}@`)
    .replace(/[\w.+-]+@[\w.-]+\.[A-Za-z]{2,}/g, "[REDACTED_EMAIL]")
    .replace(/\bBearer\s+[^\s,;]+/gi, `Bearer ${redacted}`)
    .replace(
      /([?&#](?:api_?key|code|password|secret|token)=)[^&#\s]+/gi,
      `$1${redacted}`,
    )
    .replace(
      /\b(api_?key|authorization|cookie|password|secret|token)\s*[:=]\s*[^\s,;]+/gi,
      `$1=${redacted}`,
    )
    .replace(/(session_token=)[^;\s]+/gi, `$1${redacted}`);
}

function serialize(value: unknown, seen = new WeakSet<object>()): unknown {
  if (value instanceof Error) {
    const error = value as ErrorDetails;
    return {
      name: error.name,
      message: sanitizeText(error.message),
      ...(error.code === undefined
        ? {}
        : { code: serialize(error.code, seen) }),
      ...(error.severity === undefined
        ? {}
        : { severity: serialize(error.severity, seen) }),
    };
  }
  if (typeof value === "string") return sanitizeText(value);
  if (typeof value === "bigint") return value.toString();
  if (value instanceof Date) return value.toISOString();
  if (Array.isArray(value)) {
    if (seen.has(value)) return "[CIRCULAR]";
    seen.add(value);
    return value.map((item) => serialize(item, seen));
  }
  if (value && typeof value === "object") {
    if (seen.has(value)) return "[CIRCULAR]";
    seen.add(value);
    return Object.fromEntries(
      Object.entries(value).map(([key, nestedValue]) => [
        key,
        sensitiveKey.test(key) ? redacted : serialize(nestedValue, seen),
      ]),
    );
  }
  return value;
}

function write(level: LogLevel, event: string, context: Context = {}) {
  const configured = (process.env.LOG_LEVEL as LogLevel | undefined) ?? "info";
  if (priority[level] < (priority[configured] ?? priority.info)) return;

  const entry = JSON.stringify({
    ...Object.fromEntries(
      Object.entries(context).map(([key, value]) => [
        key,
        sensitiveKey.test(key) ? redacted : serialize(value),
      ]),
    ),
    timestamp: new Date().toISOString(),
    level,
    event,
  });

  if (level === "error") console.error(entry);
  else if (level === "warn") console.warn(entry);
  else console.log(entry);
}

export const logger = {
  debug: (event: string, context?: Context) => write("debug", event, context),
  info: (event: string, context?: Context) => write("info", event, context),
  warn: (event: string, context?: Context) => write("warn", event, context),
  error: (event: string, context?: Context) => write("error", event, context),
};

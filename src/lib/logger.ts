type LogLevel = "debug" | "info" | "warn" | "error";
type Context = Record<string, unknown>;

const priority: Record<LogLevel, number> = {
  debug: 10,
  info: 20,
  warn: 30,
  error: 40,
};

type ErrorDetails = Error & {
  cause?: unknown;
  code?: unknown;
  detail?: unknown;
  hint?: unknown;
  severity?: unknown;
};

function serialize(value: unknown): unknown {
  if (value instanceof Error) {
    const error = value as ErrorDetails;
    return {
      name: error.name,
      message: error.message,
      stack: error.stack,
      ...(error.code === undefined ? {} : { code: error.code }),
      ...(error.severity === undefined ? {} : { severity: error.severity }),
      ...(error.detail === undefined ? {} : { detail: error.detail }),
      ...(error.hint === undefined ? {} : { hint: error.hint }),
      ...(error.cause === undefined ? {} : { cause: serialize(error.cause) }),
    };
  }
  return value;
}

function write(level: LogLevel, event: string, context: Context = {}) {
  const configured = (process.env.LOG_LEVEL as LogLevel | undefined) ?? "info";
  if (priority[level] < (priority[configured] ?? priority.info)) return;

  const entry = JSON.stringify({
    timestamp: new Date().toISOString(),
    level,
    event,
    ...Object.fromEntries(
      Object.entries(context).map(([key, value]) => [key, serialize(value)]),
    ),
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

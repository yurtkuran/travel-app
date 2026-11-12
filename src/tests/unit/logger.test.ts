import { afterEach, describe, expect, it, vi } from "vitest";

import { logger } from "@/lib/logger";

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllEnvs();
});

function captureErrorLog(context: Record<string, unknown>) {
  vi.stubEnv("LOG_LEVEL", "debug");
  const output: string[] = [];
  vi.spyOn(console, "error").mockImplementation((entry) => {
    output.push(String(entry));
  });

  logger.error("safe_event", context);

  expect(output).toHaveLength(1);
  return JSON.parse(output[0] ?? "{}") as Record<string, unknown>;
}

describe("structured logging", () => {
  it("redacts personal and credential context recursively", () => {
    const circular: Record<string, unknown> = {};
    circular.self = circular;
    const entry = captureErrorLog({
      authorization: "Bearer private-access-token",
      circular,
      email: "traveler@example.com",
      nested: {
        databaseUrl: "postgresql://user:password@database/traveltrove",
        setupUrl: "https://example.test/account/setup#token=private-token",
      },
      statusMessage: "Request failed with password=private-password",
      safeId: "public-id",
    });

    expect(entry.authorization).toBe("[REDACTED]");
    expect(entry.circular).toEqual({ self: "[CIRCULAR]" });
    expect(entry.email).toBe("[REDACTED]");
    expect(entry.nested).toEqual({
      databaseUrl: "[REDACTED]",
      setupUrl: "[REDACTED]",
    });
    expect(entry.statusMessage).toBe("Request failed with password=[REDACTED]");
    expect(entry.safeId).toBe("public-id");
  });

  it("limits errors to sanitized diagnostic fields", () => {
    const error = Object.assign(
      new Error(
        "Sign-in failed for traveler@example.com at postgresql://user:password@database/traveltrove?token=private-token",
      ),
      {
        cause: new Error("nested private failure"),
        code: "AUTH_FAILURE",
        detail: "Key (email)=(traveler@example.com) already exists",
        hint: "Use password private-password",
        severity: "ERROR",
      },
    );

    const entry = captureErrorLog({ error });
    const loggedError = entry.error as Record<string, unknown>;

    expect(loggedError).toEqual({
      code: "AUTH_FAILURE",
      message:
        "Sign-in failed for [REDACTED_EMAIL] at postgresql://[REDACTED]@database/traveltrove?token=[REDACTED]",
      name: "Error",
      severity: "ERROR",
    });
    expect(JSON.stringify(entry)).not.toContain("private-password");
    expect(loggedError).not.toHaveProperty("cause");
    expect(loggedError).not.toHaveProperty("detail");
    expect(loggedError).not.toHaveProperty("hint");
    expect(loggedError).not.toHaveProperty("stack");
  });

  it("does not allow context to replace structured envelope fields", () => {
    const entry = captureErrorLog({
      event: "spoofed_event",
      level: "info",
      timestamp: "spoofed_timestamp",
    });

    expect(entry.event).toBe("safe_event");
    expect(entry.level).toBe("error");
    expect(entry.timestamp).not.toBe("spoofed_timestamp");
  });
});

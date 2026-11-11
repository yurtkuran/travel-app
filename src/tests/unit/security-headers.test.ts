import { describe, expect, it } from "vitest";

import { securityHeaders } from "../../../next.config";

function headerMap(environment: string) {
  return new Map(
    securityHeaders(environment).map(({ key, value }) => [key, value]),
  );
}

describe("application security headers", () => {
  it("enforces restrictive browser defaults", () => {
    const headers = headerMap("test");
    expect(headers.get("Content-Security-Policy")).toContain(
      "default-src 'self'",
    );
    expect(headers.get("Content-Security-Policy")).toContain(
      "object-src 'none'",
    );
    expect(headers.get("Content-Security-Policy")).toContain(
      "frame-ancestors 'none'",
    );
    expect(headers.get("Content-Security-Policy")).toContain(
      "form-action 'self'",
    );
    expect(headers.get("X-Content-Type-Options")).toBe("nosniff");
    expect(headers.get("X-Frame-Options")).toBe("DENY");
    expect(headers.get("Referrer-Policy")).toBe(
      "strict-origin-when-cross-origin",
    );
    expect(headers.get("Permissions-Policy")).toContain("camera=()");
  });

  it("allows script evaluation only in development", () => {
    expect(headerMap("development").get("Content-Security-Policy")).toContain(
      "'unsafe-eval'",
    );
    expect(
      headerMap("production").get("Content-Security-Policy"),
    ).not.toContain("'unsafe-eval'");
  });

  it("emits transport security only in production", () => {
    expect(headerMap("development").has("Strict-Transport-Security")).toBe(
      false,
    );
    expect(headerMap("production").get("Strict-Transport-Security")).toBe(
      "max-age=31536000; includeSubDomains",
    );
    expect(headerMap("production").get("Content-Security-Policy")).toContain(
      "upgrade-insecure-requests",
    );
  });
});

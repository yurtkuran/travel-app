import { describe, expect, it } from "vitest";

import { serverEnvSchema } from "@/lib/env";

describe("server environment", () => {
  it("accepts a complete valid configuration", () => {
    const result = serverEnvSchema.safeParse({
      NODE_ENV: "test",
      DATABASE_URL: "postgresql://user:password@localhost:5432/traveltrove",
      BETTER_AUTH_URL: "http://localhost:3000",
      BETTER_AUTH_SECRET: "a-secret-that-is-at-least-32-characters",
      LOG_LEVEL: "info",
    });

    expect(result.success).toBe(true);
  });

  it("rejects a short authentication secret", () => {
    const result = serverEnvSchema.safeParse({
      DATABASE_URL: "postgresql://user:password@localhost:5432/traveltrove",
      BETTER_AUTH_URL: "http://localhost:3000",
      BETTER_AUTH_SECRET: "too-short",
    });

    expect(result.success).toBe(false);
  });
});

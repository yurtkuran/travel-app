import { describe, expect, it } from "vitest";

import { assertLocalTestDatabaseUrl } from "../test-database-safety";

describe("test database safety", () => {
  it.each(["localhost", "127.0.0.1", "[::1]", "db"])(
    "allows the local host %s",
    (host) => {
      expect(() =>
        assertLocalTestDatabaseUrl(
          `postgresql://traveltrove:traveltrove@${host}:5432/traveltrove`,
        ),
      ).not.toThrow();
    },
  );

  it("rejects a hosted database", () => {
    expect(() =>
      assertLocalTestDatabaseUrl(
        "postgresql://postgres:secret@aws-0-us-east-1.pooler.supabase.com:5432/postgres",
      ),
    ).toThrow("Refusing to run destructive tests against non-local database");
  });

  it("rejects non-PostgreSQL URLs", () => {
    expect(() =>
      assertLocalTestDatabaseUrl("https://localhost/database"),
    ).toThrow("Refusing to run destructive tests against non-local database");
  });
});

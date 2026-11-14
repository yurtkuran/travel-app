const localTestDatabaseHosts = new Set([
  "localhost",
  "127.0.0.1",
  "::1",
  "[::1]",
  "db",
]);

export function assertLocalTestDatabaseUrl(databaseUrl: string) {
  let parsed: URL;
  try {
    parsed = new URL(databaseUrl);
  } catch {
    throw new Error("Test DATABASE_URL must be a valid PostgreSQL URL");
  }

  if (
    !["postgresql:", "postgres:"].includes(parsed.protocol) ||
    !localTestDatabaseHosts.has(parsed.hostname)
  ) {
    throw new Error(
      `Refusing to run destructive tests against non-local database host ${parsed.hostname || "unknown"}`,
    );
  }
}

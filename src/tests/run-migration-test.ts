import { readFile } from "node:fs/promises";

import postgres from "postgres";

import { runNode, withDisposableDatabase } from "./disposable-database";

async function main() {
  await withDisposableDatabase({
    label: "migration-test database",
    prefix: "traveltrove_migration_test",
    task: async (databaseUrl) => {
      const migrationCommand = ["--import", "tsx", "src/db/migrate.ts"];
      await runNode(migrationCommand, databaseUrl);
      await runNode(migrationCommand, databaseUrl);

      const journal = JSON.parse(
        await readFile("drizzle/meta/_journal.json", "utf8"),
      ) as { entries?: unknown[] };
      const expectedMigrationCount = journal.entries?.length;
      if (!expectedMigrationCount) {
        throw new Error("Migration journal has no entries");
      }

      const sql = postgres(databaseUrl, { max: 1 });
      try {
        const [result] = await sql<
          {
            auditEventsTable: string | null;
            migrationCount: number;
            placesTable: string | null;
            usersTable: string | null;
          }[]
        >`
          select
            to_regclass('public.audit_events')::text as "auditEventsTable",
            to_regclass('public.places')::text as "placesTable",
            to_regclass('public.user')::text as "usersTable",
            (
              select count(*)::integer
                from drizzle.__drizzle_migrations
            ) as "migrationCount"
        `;

        if (!result) {
          throw new Error("Migration verification query returned no result");
        }
        if (
          !result.auditEventsTable ||
          !result.placesTable ||
          !result.usersTable
        ) {
          throw new Error(
            "Migration did not create the required release tables",
          );
        }
        if (result.migrationCount !== expectedMigrationCount) {
          throw new Error(
            `Expected ${expectedMigrationCount} applied migrations, found ${result.migrationCount}`,
          );
        }

        process.stdout.write(
          `Verified ${result.migrationCount} migrations and idempotent repeat execution\n`,
        );
      } finally {
        await sql.end();
      }
    },
  });
}

main().catch((error: unknown) => {
  process.stderr.write(
    `${error instanceof Error ? error.stack || error.message : String(error)}\n`,
  );
  process.exitCode = 1;
});

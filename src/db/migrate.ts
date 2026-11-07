import { migrate } from "drizzle-orm/postgres-js/migrator";

import { getDatabase, getSqlClient } from "./client";
import { logger } from "../lib/logger";

async function main() {
  logger.info("database_migration_started");
  await migrate(getDatabase(), { migrationsFolder: "drizzle" });
  logger.info("database_migration_completed");
  await getSqlClient().end();
}

main().catch((error: unknown) => {
  logger.error("database_migration_failed", { error });
  process.exitCode = 1;
});

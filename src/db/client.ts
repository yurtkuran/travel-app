import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";

import { getServerEnv } from "@/lib/env";

import * as schema from "./schema";

type SqlClient = ReturnType<typeof postgres>;

const globalForDatabase = globalThis as unknown as { sql?: SqlClient };

export function getSqlClient(): SqlClient {
  if (!globalForDatabase.sql) {
    globalForDatabase.sql = postgres(getServerEnv().DATABASE_URL, { max: 10 });
  }
  return globalForDatabase.sql;
}

export function getDatabase() {
  return drizzle(getSqlClient(), { schema });
}

export async function checkDatabaseConnection() {
  await getSqlClient()`select 1`;
}

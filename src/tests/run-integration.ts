import { spawn } from "node:child_process";
import { randomBytes } from "node:crypto";

import postgres from "postgres";

function run(command: string, arguments_: string[], databaseUrl: string) {
  return new Promise<void>((resolve, reject) => {
    const child = spawn(command, arguments_, {
      env: { ...process.env, DATABASE_URL: databaseUrl },
      stdio: "inherit",
    });
    child.on("error", reject);
    child.on("exit", (code, signal) => {
      if (code === 0) resolve();
      else {
        reject(
          new Error(
            signal
              ? `Child process ended with signal ${signal}`
              : `Child process exited with code ${code ?? "unknown"}`,
          ),
        );
      }
    });
  });
}

async function main() {
  const sourceUrl = process.env.DATABASE_URL;
  if (!sourceUrl) throw new Error("DATABASE_URL is required");

  const databaseName = `traveltrove_test_${process.pid}_${randomBytes(5).toString("hex")}`;
  if (!/^traveltrove_test_[a-z0-9_]+$/.test(databaseName)) {
    throw new Error("Generated an unsafe test database name");
  }

  const testUrl = new URL(sourceUrl);
  testUrl.pathname = `/${databaseName}`;
  const maintenance = postgres(sourceUrl, { max: 1 });
  let created = false;

  try {
    process.stdout.write(
      `Creating disposable integration database ${databaseName}\n`,
    );
    await maintenance.unsafe(`create database "${databaseName}"`);
    created = true;

    await run(
      process.execPath,
      ["--import", "tsx", "src/db/migrate.ts"],
      testUrl.toString(),
    );
    await run(
      process.execPath,
      [
        "node_modules/vitest/vitest.mjs",
        "run",
        "--no-file-parallelism",
        "src/tests/integration",
      ],
      testUrl.toString(),
    );
  } finally {
    if (created) {
      await maintenance`
        select pg_terminate_backend(pid)
          from pg_stat_activity
         where datname = ${databaseName}
           and pid <> pg_backend_pid()
      `;
      await maintenance.unsafe(`drop database "${databaseName}"`);
      process.stdout.write(
        `Dropped disposable integration database ${databaseName}\n`,
      );
    }
    await maintenance.end();
  }
}

main().catch((error: unknown) => {
  process.stderr.write(
    `${error instanceof Error ? error.stack || error.message : String(error)}\n`,
  );
  process.exitCode = 1;
});

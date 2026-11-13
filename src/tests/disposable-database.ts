import { spawn } from "node:child_process";
import { randomBytes } from "node:crypto";

import postgres from "postgres";

export function runNode(arguments_: string[], databaseUrl: string) {
  return new Promise<void>((resolve, reject) => {
    const child = spawn(process.execPath, arguments_, {
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

export async function withDisposableDatabase({
  label,
  prefix,
  task,
}: {
  label: string;
  prefix: string;
  task: (databaseUrl: string) => Promise<void>;
}) {
  const sourceUrl = process.env.DATABASE_URL;
  if (!sourceUrl) throw new Error("DATABASE_URL is required");

  const databaseName = `${prefix}_${process.pid}_${randomBytes(5).toString("hex")}`;
  if (!/^traveltrove_[a-z0-9_]+$/.test(databaseName)) {
    throw new Error("Generated an unsafe disposable database name");
  }

  const disposableUrl = new URL(sourceUrl);
  disposableUrl.pathname = `/${databaseName}`;
  const maintenance = postgres(sourceUrl, { max: 1 });
  let created = false;

  try {
    process.stdout.write(`Creating disposable ${label} ${databaseName}\n`);
    await maintenance.unsafe(`create database "${databaseName}"`);
    created = true;
    await task(disposableUrl.toString());
  } finally {
    if (created) {
      await maintenance`
        select pg_terminate_backend(pid)
          from pg_stat_activity
         where datname = ${databaseName}
           and pid <> pg_backend_pid()
      `;
      await maintenance.unsafe(`drop database "${databaseName}"`);
      process.stdout.write(`Dropped disposable ${label} ${databaseName}\n`);
    }
    await maintenance.end();
  }
}

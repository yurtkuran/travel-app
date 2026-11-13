import { execFile, spawn } from "node:child_process";
import { createHash, randomUUID } from "node:crypto";
import {
  mkdir,
  mkdtemp,
  open,
  readFile,
  rm,
  writeFile,
} from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { promisify } from "node:util";

import postgres from "postgres";

import { runNode, withDisposableDatabase } from "./disposable-database";

const execFileAsync = promisify(execFile);

async function postgresContainerId() {
  const configured = process.env.POSTGRES_CONTAINER_ID?.trim();
  if (configured) return configured;

  const { stdout } = await execFileAsync(
    "docker",
    ["compose", "ps", "-q", "db"],
    { cwd: process.cwd() },
  );
  const discovered = stdout.trim();
  if (!discovered) {
    throw new Error(
      "PostgreSQL container not found; start compose db or set POSTGRES_CONTAINER_ID",
    );
  }
  return discovered;
}

async function runCommand(
  command: string,
  arguments_: string[],
  options: { inputPath?: string; outputPath?: string } = {},
) {
  const input = options.inputPath
    ? await open(options.inputPath, "r")
    : undefined;
  const output = options.outputPath
    ? await open(options.outputPath, "w", 0o600)
    : undefined;

  try {
    await new Promise<void>((resolve, reject) => {
      const child = spawn(command, arguments_, {
        stdio: [input?.fd ?? "ignore", output?.fd ?? "inherit", "inherit"],
      });
      child.on("error", reject);
      child.on("exit", (code, signal) => {
        if (code === 0) resolve();
        else {
          reject(
            new Error(
              signal
                ? `${command} ended with signal ${signal}`
                : `${command} exited with code ${code ?? "unknown"}`,
            ),
          );
        }
      });
    });
  } finally {
    await Promise.all([input?.close(), output?.close()]);
  }
}

function databaseConnection(databaseUrl: string) {
  const parsed = new URL(databaseUrl);
  return {
    database: decodeURIComponent(parsed.pathname.slice(1)),
    username: decodeURIComponent(parsed.username),
  };
}

async function sha256(filePath: string) {
  return createHash("sha256")
    .update(await readFile(filePath))
    .digest("hex");
}

async function main() {
  const containerId = await postgresContainerId();
  if (!/^[a-zA-Z0-9_.-]+$/.test(containerId)) {
    throw new Error(
      "PostgreSQL container identifier contains unsafe characters",
    );
  }

  const workspace = await mkdtemp(
    path.join(tmpdir(), "traveltrove-backup-restore-"),
  );
  const databaseDump = path.join(workspace, "postgresql.dump");
  const mediaArchive = path.join(workspace, "media.tar.gz");
  const manifestPath = path.join(workspace, "manifest.json");
  const sourceMedia = path.join(workspace, "source-media");
  const restoredMedia = path.join(workspace, "restored-media");
  const mediaKey = "places/backup-test/display.webp";
  const mediaContents = Buffer.from("traveltrove-backup-media-sentinel");
  const cityName = `Backup Restore ${randomUUID()}`;

  try {
    await mkdir(path.join(sourceMedia, path.dirname(mediaKey)), {
      recursive: true,
    });
    await writeFile(path.join(sourceMedia, mediaKey), mediaContents);

    await withDisposableDatabase({
      label: "backup-source database",
      prefix: "traveltrove_backup_source",
      task: async (sourceUrl) => {
        await runNode(["--import", "tsx", "src/db/migrate.ts"], sourceUrl);
        const sourceSql = postgres(sourceUrl, { max: 1 });
        try {
          await sourceSql`
            insert into cities (name, country, slug)
            values (${cityName}, 'Test Country', ${`backup-${randomUUID()}`})
          `;
        } finally {
          await sourceSql.end();
        }

        const source = databaseConnection(sourceUrl);
        await runCommand(
          "docker",
          [
            "exec",
            containerId,
            "pg_dump",
            "--format=custom",
            "--no-owner",
            "--no-acl",
            `--username=${source.username}`,
            `--dbname=${source.database}`,
          ],
          { outputPath: databaseDump },
        );
        await runCommand("tar", ["-C", sourceMedia, "-czf", mediaArchive, "."]);

        const manifest = {
          databaseSha256: await sha256(databaseDump),
          mediaSha256: await sha256(mediaArchive),
          version: 1,
        };
        await writeFile(
          manifestPath,
          `${JSON.stringify(manifest, null, 2)}\n`,
          {
            mode: 0o600,
          },
        );
        const storedManifest = JSON.parse(
          await readFile(manifestPath, "utf8"),
        ) as typeof manifest;
        if (
          storedManifest.databaseSha256 !== (await sha256(databaseDump)) ||
          storedManifest.mediaSha256 !== (await sha256(mediaArchive))
        ) {
          throw new Error("Backup artifact checksum verification failed");
        }

        await withDisposableDatabase({
          label: "backup-restore database",
          prefix: "traveltrove_backup_restore",
          task: async (restoreUrl) => {
            const restore = databaseConnection(restoreUrl);
            await runCommand(
              "docker",
              [
                "exec",
                "-i",
                containerId,
                "pg_restore",
                "--exit-on-error",
                "--no-owner",
                "--no-acl",
                `--username=${restore.username}`,
                `--dbname=${restore.database}`,
              ],
              { inputPath: databaseDump },
            );

            const restoreSql = postgres(restoreUrl, { max: 1 });
            try {
              const [restoredCity] = await restoreSql<{ name: string }[]>`
                select name from cities where name = ${cityName}
              `;
              if (restoredCity?.name !== cityName) {
                throw new Error("Database sentinel was not restored");
              }
            } finally {
              await restoreSql.end();
            }
          },
        });
      },
    });

    await mkdir(restoredMedia);
    await runCommand("tar", ["-xzf", mediaArchive, "-C", restoredMedia]);
    const restoredContents = await readFile(path.join(restoredMedia, mediaKey));
    if (!restoredContents.equals(mediaContents)) {
      throw new Error("Media sentinel was not restored");
    }

    process.stdout.write(
      "Verified checksummed PostgreSQL and media backup restoration\n",
    );
  } finally {
    await rm(workspace, { recursive: true, force: true });
  }
}

main().catch((error: unknown) => {
  process.stderr.write(
    `${error instanceof Error ? error.stack || error.message : String(error)}\n`,
  );
  process.exitCode = 1;
});

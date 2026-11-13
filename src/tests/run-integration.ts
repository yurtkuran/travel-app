import { runNode, withDisposableDatabase } from "./disposable-database";

async function main() {
  await withDisposableDatabase({
    label: "integration database",
    prefix: "traveltrove_test",
    task: async (databaseUrl) => {
      await runNode(["--import", "tsx", "src/db/migrate.ts"], databaseUrl);
      await runNode(
        [
          "node_modules/vitest/vitest.mjs",
          "run",
          "--no-file-parallelism",
          "src/tests/integration",
        ],
        databaseUrl,
      );
    },
  });
}

main().catch((error: unknown) => {
  process.stderr.write(
    `${error instanceof Error ? error.stack || error.message : String(error)}\n`,
  );
  process.exitCode = 1;
});

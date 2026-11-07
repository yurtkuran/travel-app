import { getSqlClient } from "@/db/client";
import { bootstrapFirstAdmin } from "@/features/auth/server/bootstrap-admin";
import { logger } from "@/lib/logger";

import { requireArgument } from "./arguments";

async function main() {
  const result = await bootstrapFirstAdmin({
    email: requireArgument("email"),
    name: requireArgument("name"),
    password: process.env.TRAVELTROVE_BOOTSTRAP_PASSWORD ?? "",
  });

  logger.info("bootstrap_admin_created", result);
}

main()
  .catch((error: unknown) => {
    logger.error("bootstrap_admin_failed", { error });
    process.exitCode = 1;
  })
  .finally(async () => {
    await getSqlClient().end();
  });

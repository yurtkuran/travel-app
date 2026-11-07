import { getSqlClient } from "@/db/client";
import { createRecoveryLink } from "@/features/auth/server/setup-tokens";
import { logger } from "@/lib/logger";

import { requireArgument } from "./arguments";

async function main() {
  const adminEmail = requireArgument("admin-email").trim().toLowerCase();
  const targetEmail = requireArgument("email").trim().toLowerCase();
  const sql = getSqlClient();
  const [admin] = await sql<{ id: string }[]>`
    select id from "user"
     where lower(email) = ${adminEmail}
       and role = 'admin'
       and not banned
  `;
  const [target] = await sql<{ id: string }[]>`
    select id from "user" where lower(email) = ${targetEmail}
  `;
  if (!admin || !target)
    throw new Error("Active administrator or target account not found");

  const result = await createRecoveryLink(
    { id: admin.id, role: "admin" },
    target.id,
  );
  process.stdout.write(`${result.setupUrl}\n`);
  logger.info("account_recovery_link_created", {
    expiresAt: result.expiresAt,
    userId: target.id,
  });
}

main()
  .catch((error: unknown) => {
    logger.error("account_recovery_failed", { error });
    process.exitCode = 1;
  })
  .finally(async () => {
    await getSqlClient().end();
  });

import { getSqlClient } from "@/db/client";
import { provisionUser } from "@/features/auth/server/setup-tokens";
import { logger } from "@/lib/logger";

import { requireArgument } from "./arguments";

async function main() {
  const adminEmail = requireArgument("admin-email").trim().toLowerCase();
  const sql = getSqlClient();
  const [admin] = await sql<{ id: string }[]>`
    select id from "user"
     where lower(email) = ${adminEmail}
       and role = 'admin'
       and not banned
  `;
  if (!admin) throw new Error("Active administrator not found");

  const result = await provisionUser(
    { id: admin.id, role: "admin" },
    { email: requireArgument("email"), name: requireArgument("name") },
  );

  process.stdout.write(`${result.setupUrl}\n`);
  logger.info("user_provisioned", {
    expiresAt: result.expiresAt,
    userId: result.userId,
  });
}

main()
  .catch((error: unknown) => {
    logger.error("user_provision_failed", { error });
    process.exitCode = 1;
  })
  .finally(async () => {
    await getSqlClient().end();
  });

import { randomUUID } from "node:crypto";

import { hashPassword } from "better-auth/crypto";
import { z } from "zod";

import { getSqlClient } from "@/db/client";

const bootstrapAdminSchema = z.object({
  email: z.email().transform((value) => value.trim().toLowerCase()),
  name: z.string().trim().min(1).max(160),
  password: z.string().min(12).max(128),
});

export async function bootstrapFirstAdmin(
  input: z.input<typeof bootstrapAdminSchema>,
): Promise<{ email: string; userId: string }> {
  const values = bootstrapAdminSchema.parse(input);
  const passwordHash = await hashPassword(values.password);
  const sql = getSqlClient();
  const userId = randomUUID();

  await sql.begin(async (transaction) => {
    const [admins] = await transaction<{ count: number }[]>`
      select count(*)::integer as count from "user" where role = 'admin' and not banned
    `;
    if ((admins?.count ?? 0) > 0) {
      throw new Error("An active administrator already exists");
    }

    await transaction`
      insert into "user" (id, name, email, email_verified, role)
      values (${userId}, ${values.name}, ${values.email}, true, 'admin')
    `;
    await transaction`
      insert into account (id, account_id, provider_id, user_id, password)
      values (${randomUUID()}, ${userId}, 'credential', ${userId}, ${passwordHash})
    `;
    await transaction`
      insert into audit_events (actor_type, action, target_type, target_id)
      values ('system', 'user.bootstrap_admin_created', 'user', ${userId})
    `;
  });

  return { email: values.email, userId };
}

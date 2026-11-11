import "server-only";

import { hashPassword, verifyPassword } from "better-auth/crypto";
import { z } from "zod";

import { getSqlClient } from "@/db/client";
import { requireCapability, type Actor } from "@/features/auth/permissions";

const profileSchema = z.object({
  name: z.string().trim().min(1).max(160),
});

const passwordSchema = z
  .object({
    confirmation: z.string(),
    currentPassword: z.string().min(1).max(128),
    newPassword: z.string().min(12).max(128),
  })
  .refine((value) => value.newPassword === value.confirmation, {
    message: "The new passwords do not match",
    path: ["confirmation"],
  });

export class AccountSelfServiceError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "AccountSelfServiceError";
  }
}

export interface OwnSession {
  createdAt: string;
  expiresAt: string;
  id: string;
  ipAddress: string | null;
  isCurrent: boolean;
  updatedAt: string;
  userAgent: string | null;
}

export async function updateOwnProfile(
  actor: Actor,
  raw: z.input<typeof profileSchema>,
) {
  requireCapability(actor, "account.manageOwn");
  const input = profileSchema.parse(raw);
  const [updated] = await getSqlClient()<{ email: string; name: string }[]>`
    update "user"
       set name = ${input.name}, updated_at = now()
     where id = ${actor.id}
     returning name, email
  `;
  if (!updated) throw new AccountSelfServiceError("Account not found");
  return updated;
}

export async function listOwnSessions(
  actor: Actor,
  currentSessionId: string,
): Promise<OwnSession[]> {
  requireCapability(actor, "account.manageOwn");
  return getSqlClient()<OwnSession[]>`
    select id,
           created_at::text as "createdAt",
           updated_at::text as "updatedAt",
           expires_at::text as "expiresAt",
           ip_address as "ipAddress",
           user_agent as "userAgent",
           id = ${currentSessionId} as "isCurrent"
      from session
     where user_id = ${actor.id}
       and expires_at > now()
     order by (id = ${currentSessionId}) desc, updated_at desc, created_at desc
  `;
}

export async function revokeOwnSession(
  actor: Actor,
  sessionId: string,
  currentSessionId: string,
) {
  requireCapability(actor, "account.manageOwn");
  if (!sessionId || sessionId === currentSessionId) {
    throw new AccountSelfServiceError(
      "The current session must be ended by signing out",
    );
  }

  const sql = getSqlClient();
  await sql.begin(async (transaction) => {
    const [deleted] = await transaction<{ id: string }[]>`
      delete from session
       where id = ${sessionId}
         and user_id = ${actor.id}
       returning id
    `;
    if (!deleted) throw new AccountSelfServiceError("Session not found");
    await transaction`
      insert into audit_events (actor_type, actor_user_id, action, target_type, target_id)
      values ('user', ${actor.id}, 'user.session_revoked', 'user', ${actor.id})
    `;
  });
}

export async function changeOwnPassword(
  actor: Actor,
  currentSessionId: string,
  raw: z.input<typeof passwordSchema>,
) {
  requireCapability(actor, "account.manageOwn");
  const input = passwordSchema.parse(raw);
  const sql = getSqlClient();

  await sql.begin(async (transaction) => {
    const [credential] = await transaction<
      { id: string; password: string | null }[]
    >`
      select id, password
        from account
       where user_id = ${actor.id}
         and provider_id = 'credential'
       for update
    `;
    if (
      !credential?.password ||
      !(await verifyPassword({
        hash: credential.password,
        password: input.currentPassword,
      }))
    ) {
      throw new AccountSelfServiceError("The current password is incorrect");
    }

    const password = await hashPassword(input.newPassword);
    await transaction`
      update account
         set password = ${password}, updated_at = now()
       where id = ${credential.id}
    `;
    await transaction`
      delete from session
       where user_id = ${actor.id}
         and id <> ${currentSessionId}
    `;
    await transaction`
      insert into audit_events (actor_type, actor_user_id, action, target_type, target_id)
      values ('user', ${actor.id}, 'user.password_changed', 'user', ${actor.id})
    `;
  });
}

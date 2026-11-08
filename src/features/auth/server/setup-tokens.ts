import { createHash, randomBytes, randomUUID } from "node:crypto";

import { hashPassword } from "better-auth/crypto";
import type postgres from "postgres";
import { z } from "zod";

import { getSqlClient } from "@/db/client";
import { requireCapability, type Actor } from "@/features/auth/permissions";
import { getServerEnv } from "@/lib/env";

export const SETUP_TOKEN_TTL_SECONDS = 60 * 60 * 72;

const provisionUserSchema = z.object({
  email: z.email().transform((value) => value.trim().toLowerCase()),
  name: z.string().trim().min(1).max(160),
});

const passwordSchema = z.string().min(12).max(128);

type SetupPurpose = "initial_setup" | "admin_recovery";
type Transaction = postgres.TransactionSql<Record<string, never>>;

export class SetupTokenError extends Error {
  constructor() {
    super("This account setup link is invalid or has expired");
    this.name = "SetupTokenError";
  }
}

function tokenHash(token: string): string {
  return createHash("sha256").update(token, "utf8").digest("hex");
}

function createRawToken() {
  const token = randomBytes(32).toString("base64url");
  return { token, hash: tokenHash(token) };
}

function setupUrl(token: string): string {
  const url = new URL("/account/setup", getServerEnv().BETTER_AUTH_URL);
  url.hash = new URLSearchParams({ token }).toString();
  return url.toString();
}

async function insertSetupToken(
  transaction: Transaction,
  input: {
    actorId: string;
    purpose: SetupPurpose;
    tokenHash: string;
    userId: string;
  },
) {
  await transaction`
    update account_setup_tokens
       set revoked_at = now()
     where user_id = ${input.userId}
       and consumed_at is null
       and revoked_at is null
  `;

  const [created] = await transaction<{ expires_at: string }[]>`
    insert into account_setup_tokens (
      user_id,
      token_hash,
      purpose,
      created_by_user_id,
      expires_at
    ) values (
      ${input.userId},
      ${input.tokenHash},
      ${input.purpose},
      ${input.actorId},
      now() + (${SETUP_TOKEN_TTL_SECONDS} * interval '1 second')
    )
    returning expires_at
  `;

  if (!created) throw new SetupTokenError();
  return created.expires_at;
}

export async function provisionUser(
  actor: Actor,
  input: z.input<typeof provisionUserSchema>,
): Promise<{
  email: string;
  expiresAt: string;
  setupUrl: string;
  userId: string;
}> {
  requireCapability(actor, "users.manage");
  const values = provisionUserSchema.parse(input);
  const sql = getSqlClient();
  const userId = randomUUID();
  const rawToken = createRawToken();

  const expiresAt = await sql.begin(async (transaction) => {
    await transaction`
      insert into "user" (id, name, email, email_verified, role)
      values (${userId}, ${values.name}, ${values.email}, false, 'user')
    `;

    const expiry = await insertSetupToken(transaction, {
      actorId: actor.id,
      purpose: "initial_setup",
      tokenHash: rawToken.hash,
      userId,
    });

    await transaction`
      insert into audit_events (actor_type, actor_user_id, action, target_type, target_id)
      values ('user', ${actor.id}, 'user.provisioned', 'user', ${userId})
    `;

    return expiry;
  });

  return {
    email: values.email,
    expiresAt,
    setupUrl: setupUrl(rawToken.token),
    userId,
  };
}

export async function createRecoveryLink(
  actor: Actor,
  userId: string,
): Promise<{ expiresAt: string; setupUrl: string }> {
  requireCapability(actor, "users.manage");
  const sql = getSqlClient();
  const rawToken = createRawToken();

  const expiresAt = await sql.begin(async (transaction) => {
    const [user] = await transaction<{ banned: boolean }[]>`
      select banned from "user" where id = ${userId} for update
    `;
    if (!user || user.banned) throw new SetupTokenError();

    await transaction`delete from session where user_id = ${userId}`;
    const expiry = await insertSetupToken(transaction, {
      actorId: actor.id,
      purpose: "admin_recovery",
      tokenHash: rawToken.hash,
      userId,
    });

    await transaction`
      insert into audit_events (actor_type, actor_user_id, action, target_type, target_id)
      values ('user', ${actor.id}, 'user.recovery_link_generated', 'user', ${userId})
    `;

    return expiry;
  });

  return { expiresAt, setupUrl: setupUrl(rawToken.token) };
}

export async function isSetupTokenUsable(token: string): Promise<boolean> {
  if (!/^[A-Za-z0-9_-]{43}$/.test(token)) return false;
  const sql = getSqlClient();
  const [row] = await sql<{ valid: boolean }[]>`
    select exists (
      select 1
        from account_setup_tokens token
        join "user" on "user".id = token.user_id
       where token.token_hash = ${tokenHash(token)}
         and token.consumed_at is null
         and token.revoked_at is null
         and token.expires_at > now()
         and not "user".banned
    ) as valid
  `;
  return row?.valid ?? false;
}

export async function consumeSetupToken(
  token: string,
  newPassword: string,
): Promise<void> {
  if (!/^[A-Za-z0-9_-]{43}$/.test(token)) throw new SetupTokenError();
  const password = passwordSchema.parse(newPassword);
  const passwordHash = await hashPassword(password);
  const sql = getSqlClient();

  await sql.begin(async (transaction) => {
    const [setup] = await transaction<
      { banned: boolean; unexpired: boolean; user_id: string }[]
    >`
      select token.user_id, token.expires_at > now() as unexpired, "user".banned
        from account_setup_tokens token
        join "user" on "user".id = token.user_id
       where token.token_hash = ${tokenHash(token)}
         and token.consumed_at is null
         and token.revoked_at is null
       for update of token
    `;

    if (!setup || setup.banned || !setup.unexpired) {
      throw new SetupTokenError();
    }

    await transaction`
      insert into account (id, account_id, provider_id, user_id, password)
      values (${randomUUID()}, ${setup.user_id}, 'credential', ${setup.user_id}, ${passwordHash})
      on conflict (provider_id, account_id)
      do update set password = excluded.password, updated_at = now()
    `;
    await transaction`
      update "user"
         set email_verified = true, updated_at = now()
       where id = ${setup.user_id}
    `;
    await transaction`
      update account_setup_tokens
         set consumed_at = now()
       where token_hash = ${tokenHash(token)}
    `;
    await transaction`delete from session where user_id = ${setup.user_id}`;
    await transaction`
      insert into audit_events (actor_type, action, target_type, target_id)
      values ('system', 'user.setup_completed', 'user', ${setup.user_id})
    `;
  });
}

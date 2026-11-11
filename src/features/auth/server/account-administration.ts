import "server-only";

import type postgres from "postgres";

import { getSqlClient } from "@/db/client";
import {
  AuthorizationError,
  requireCapability,
  type Actor,
  type Role,
} from "@/features/auth/permissions";

type Transaction = postgres.TransactionSql<Record<string, never>>;

export class AccountAdministrationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "AccountAdministrationError";
  }
}

async function getTargetUser(transaction: Transaction, userId: string) {
  const [target] = await transaction<
    { banned: boolean; id: string; role: Role }[]
  >`
    select id, role, banned from "user" where id = ${userId} for update
  `;
  if (!target) throw new AccountAdministrationError("Account not found");
  return target;
}

async function assertNotFinalActiveAdmin(
  transaction: Transaction,
  target: { banned: boolean; id: string; role: Role },
) {
  if (target.role !== "admin" || target.banned) return;

  const [result] = await transaction<{ count: number }[]>`
    select count(*)::integer as count
      from "user"
     where role = 'admin'
       and not banned
  `;
  if ((result?.count ?? 0) <= 1) {
    throw new AccountAdministrationError(
      "The final active administrator cannot be demoted, suspended, or deleted",
    );
  }
}

export async function changeUserRole(actor: Actor, userId: string, role: Role) {
  requireCapability(actor, "users.manage");
  const sql = getSqlClient();

  await sql.begin(async (transaction) => {
    const target = await getTargetUser(transaction, userId);
    if (target.role === role) return;
    if (role === "user") await assertNotFinalActiveAdmin(transaction, target);

    if (role === "admin") {
      const [activated] = await transaction<{ activated: boolean }[]>`
        select exists (
          select 1 from account
           where user_id = ${userId}
             and provider_id = 'credential'
             and password is not null
        ) as activated
      `;
      if (!activated?.activated || target.banned) {
        throw new AccountAdministrationError(
          "Only an activated, unsuspended user can be promoted",
        );
      }
    }

    await transaction`update "user" set role = ${role}, updated_at = now() where id = ${userId}`;
    await transaction`delete from session where user_id = ${userId}`;
    await transaction`
      insert into audit_events (actor_type, actor_user_id, action, target_type, target_id, metadata)
      values (
        'user',
        ${actor.id},
        'user.role_changed',
        'user',
        ${userId},
        jsonb_build_object('from', ${target.role}::text, 'to', ${role}::text)
      )
    `;
  });
}

export async function setUserSuspended(
  actor: Actor,
  userId: string,
  suspended: boolean,
  reason?: string,
) {
  requireCapability(actor, "users.manage");
  const sql = getSqlClient();

  await sql.begin(async (transaction) => {
    const target = await getTargetUser(transaction, userId);
    if (actor.id === userId) {
      throw new AuthorizationError(
        "Administrators cannot suspend their own account",
      );
    }
    if (suspended) await assertNotFinalActiveAdmin(transaction, target);

    await transaction`
      update "user"
         set banned = ${suspended},
             ban_reason = ${suspended ? reason?.trim() || "Suspended by administrator" : null},
             ban_expires = null,
             updated_at = now()
       where id = ${userId}
    `;
    await transaction`delete from session where user_id = ${userId}`;
    if (suspended) {
      await transaction`
        update account_setup_tokens
           set revoked_at = now()
         where user_id = ${userId}
           and consumed_at is null
           and revoked_at is null
      `;
    }
    await transaction`
      insert into audit_events (actor_type, actor_user_id, action, target_type, target_id)
      values (
        'user',
        ${actor.id},
        ${suspended ? "user.suspended" : "user.restored"},
        'user',
        ${userId}
      )
    `;
  });
}

export async function deleteUserAccount(actor: Actor, userId: string) {
  requireCapability(actor, "users.manage");
  if (actor.id === userId) {
    throw new AuthorizationError(
      "Administrators cannot delete their own account",
    );
  }
  const sql = getSqlClient();

  await sql.begin(async (transaction) => {
    const target = await getTargetUser(transaction, userId);
    await assertNotFinalActiveAdmin(transaction, target);

    await transaction`
      delete from places
       where submitted_by_user_id = ${userId}
         and status in ('draft', 'rejected')
    `;
    await transaction`
      update places
         set status = 'withdrawn',
             submitted_by_user_id = null,
             updated_by_user_id = null,
             updated_at = now()
       where submitted_by_user_id = ${userId}
         and status = 'pending_review'
    `;
    await transaction`
      delete from place_submission_provenance where submitter_user_id = ${userId}
    `;
    await transaction`
      delete from place_change_proposals
       where proposed_by_user_id = ${userId}
         and status = 'draft'
    `;
    await transaction`
      update place_change_proposals
         set status = case when status = 'pending_review' then 'withdrawn' else status end,
             proposed_by_user_id = null,
             submitter_notes = null,
             withdrawn_at = case when status = 'pending_review' then now() else withdrawn_at end,
             updated_at = now()
       where proposed_by_user_id = ${userId}
    `;

    await transaction`delete from "user" where id = ${userId}`;
    await transaction`
      insert into audit_events (actor_type, actor_user_id, action, target_type, target_id)
      values ('user', ${actor.id}, 'user.deleted', 'user', ${userId})
    `;
  });
}

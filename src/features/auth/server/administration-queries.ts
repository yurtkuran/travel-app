import "server-only";

import { z } from "zod";

import { getSqlClient } from "@/db/client";
import {
  requireCapability,
  type Actor,
  type Role,
} from "@/features/auth/permissions";

const userListSchema = z.object({
  page: z.coerce.number().int().positive().default(1).catch(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20).catch(20),
  q: z.string().trim().max(100).default("").catch(""),
  status: z
    .enum(["all", "active", "pending", "suspended"])
    .default("all")
    .catch("all"),
});

export interface AdminUserListItem {
  activated: boolean;
  banned: boolean;
  createdAt: string;
  email: string;
  id: string;
  name: string;
  role: Role;
  setupExpiresAt: string | null;
  status: "active" | "pending" | "suspended";
}

export async function listAdminUsers(
  actor: Actor,
  raw: z.input<typeof userListSchema> = {},
) {
  requireCapability(actor, "users.manage");
  const input = userListSchema.parse(raw);
  const offset = (input.page - 1) * input.pageSize;
  const sql = getSqlClient();
  const statusCondition =
    input.status === "active"
      ? sql`and not users.banned and credential.activated`
      : input.status === "pending"
        ? sql`and not users.banned and not credential.activated`
        : input.status === "suspended"
          ? sql`and users.banned`
          : sql``;
  const base = sql`
    from "user" users
    left join lateral (
      select exists(
        select 1 from account
         where user_id=users.id and provider_id='credential' and password is not null
      ) as activated
    ) credential on true
    left join lateral (
      select expires_at::text as expires_at
        from account_setup_tokens
       where user_id=users.id and consumed_at is null and revoked_at is null and expires_at > now()
       order by created_at desc limit 1
    ) setup on true
    where (${input.q}='' or position(lower(${input.q}) in lower(concat_ws(' ', users.name, users.email))) > 0)
    ${statusCondition}
  `;
  const [items, totals] = await Promise.all([
    sql<AdminUserListItem[]>`
      select users.id, users.name, users.email, users.role, users.banned,
             users.created_at::text as "createdAt", credential.activated,
             setup.expires_at as "setupExpiresAt",
             case when users.banned then 'suspended'
                  when credential.activated then 'active' else 'pending' end as status
      ${base}
      order by users.created_at desc, users.id
      limit ${input.pageSize} offset ${offset}
    `,
    sql<{ count: number }[]>`select count(*)::integer as count ${base}`,
  ]);
  return {
    input,
    items,
    page: input.page,
    pageSize: input.pageSize,
    total: totals[0]?.count ?? 0,
  };
}

export interface AdminUserDetail extends AdminUserListItem {
  banReason: string | null;
  emailVerified: boolean;
  sessionCount: number;
  updatedAt: string;
}

export async function getAdminUser(actor: Actor, userId: string) {
  requireCapability(actor, "users.manage");
  const [user] = await getSqlClient()<AdminUserDetail[]>`
    select users.id, users.name, users.email, users.role, users.banned,
           users.ban_reason as "banReason", users.email_verified as "emailVerified",
           users.created_at::text as "createdAt", users.updated_at::text as "updatedAt",
           exists(select 1 from account where user_id=users.id and provider_id='credential' and password is not null) as activated,
           (select expires_at::text from account_setup_tokens where user_id=users.id and consumed_at is null and revoked_at is null and expires_at > now() order by created_at desc limit 1) as "setupExpiresAt",
           (select count(*)::integer from session where user_id=users.id and expires_at > now()) as "sessionCount",
           case when users.banned then 'suspended'
                when exists(select 1 from account where user_id=users.id and provider_id='credential' and password is not null) then 'active'
                else 'pending' end as status
      from "user" users where users.id=${userId}
  `;
  return user ?? null;
}

const auditListSchema = z.object({
  page: z.coerce.number().int().positive().default(1).catch(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(30).catch(30),
  q: z.string().trim().max(100).default("").catch(""),
});

export interface AuditListItem {
  action: string;
  actorName: string | null;
  actorType: "system" | "user";
  createdAt: string;
  id: string;
  targetId: string | null;
  targetType: string;
}

export async function listAuditEvents(
  actor: Actor,
  raw: z.input<typeof auditListSchema> = {},
) {
  requireCapability(actor, "operations.manage");
  const input = auditListSchema.parse(raw);
  const offset = (input.page - 1) * input.pageSize;
  const sql = getSqlClient();
  const condition = sql`
    ${input.q}='' or position(lower(${input.q}) in lower(concat_ws(' ', audit.action, audit.target_type, audit.target_id, actor.name))) > 0
  `;
  const [items, totals] = await Promise.all([
    sql<AuditListItem[]>`
      select audit.id, audit.actor_type as "actorType", actor.name as "actorName",
             audit.action, audit.target_type as "targetType", audit.target_id as "targetId",
             audit.created_at::text as "createdAt"
        from audit_events audit left join "user" actor on actor.id=audit.actor_user_id
       where ${condition}
       order by audit.created_at desc, audit.id desc
       limit ${input.pageSize} offset ${offset}
    `,
    sql<{ count: number }[]>`
      select count(*)::integer as count
        from audit_events audit left join "user" actor on actor.id=audit.actor_user_id
       where ${condition}
    `,
  ]);
  return {
    input,
    items,
    page: input.page,
    pageSize: input.pageSize,
    total: totals[0]?.count ?? 0,
  };
}

import { randomUUID } from "node:crypto";

import { afterAll, beforeAll, describe, expect, test } from "vitest";

import { getSqlClient } from "@/db/client";
import {
  AccountAdministrationError,
  changeUserRole,
  setUserSuspended,
} from "@/features/auth/server/account-administration";
import {
  getAdminUser,
  listAdminUsers,
  listAuditEvents,
} from "@/features/auth/server/administration-queries";
import {
  createRecoveryLink,
  provisionUser,
} from "@/features/auth/server/setup-tokens";

import { createTestUser } from "../factories/database";

const sql = getSqlClient();
let adminId: string;
let activeUserId: string;
let pendingUserId: string;
let suspendedUserId: string;
const actor = () => ({ id: adminId, role: "admin" as const });

describe("account administration queries and lifecycle", () => {
  beforeAll(async () => {
    const [admin, active, suspended] = await Promise.all([
      createTestUser(sql, "Query Administrator"),
      createTestUser(sql, "Activated Account"),
      createTestUser(sql, "Suspended Account"),
    ]);
    adminId = admin.id;
    activeUserId = active.id;
    suspendedUserId = suspended.id;
    await sql`update "user" set role='admin' where id=${adminId}`;
    await sql`
      insert into account (id, account_id, provider_id, user_id, password)
      values (${randomUUID()}, ${activeUserId}, 'credential', ${activeUserId}, 'test-password-hash')
    `;
    const pending = await provisionUser(actor(), {
      email: `pending-${randomUUID()}@example.test`,
      name: "Pending Setup Account",
    });
    pendingUserId = pending.userId;
    await setUserSuspended(
      actor(),
      suspendedUserId,
      true,
      "Administrative test",
    );
  });

  afterAll(async () => {
    const ids = [adminId, activeUserId, pendingUserId, suspendedUserId].filter(
      Boolean,
    );
    if (ids.length) {
      await sql`delete from audit_events where actor_user_id in ${sql(ids)} or target_id in ${sql(ids)}`;
      await sql`delete from "user" where id in ${sql(ids)}`;
    }
    await sql.end();
  });

  test("lists and filters activation states without private activity", async () => {
    const active = await listAdminUsers(actor(), {
      q: "Activated Account",
      status: "active",
    });
    expect(active.items).toHaveLength(1);
    expect(active.items[0]).toMatchObject({
      activated: true,
      id: activeUserId,
      status: "active",
    });
    const pending = await listAdminUsers(actor(), { status: "pending" });
    expect(pending.items.map(({ id }) => id)).toContain(pendingUserId);
    const suspended = await listAdminUsers(actor(), { status: "suspended" });
    expect(suspended.items.map(({ id }) => id)).toContain(suspendedUserId);
  });

  test("returns operational account detail without exposing visits", async () => {
    expect(await getAdminUser(actor(), activeUserId)).toMatchObject({
      activated: true,
      emailVerified: true,
      sessionCount: 0,
    });
  });

  test("promotes activated users and rejects pending promotion", async () => {
    await changeUserRole(actor(), activeUserId, "admin");
    expect(await getAdminUser(actor(), activeUserId)).toMatchObject({
      role: "admin",
    });
    await expect(
      changeUserRole(actor(), pendingUserId, "admin"),
    ).rejects.toBeInstanceOf(AccountAdministrationError);
  });

  test("replaces setup links and exposes only redacted audit records", async () => {
    const before = await sql<{ tokenHash: string }[]>`
      select token_hash as "tokenHash" from account_setup_tokens
       where user_id=${pendingUserId} and revoked_at is null
    `;
    expect(before).toHaveLength(1);
    await createRecoveryLink(actor(), pendingUserId);
    const tokens = await sql<{ active: boolean }[]>`
      select revoked_at is null as active from account_setup_tokens
       where user_id=${pendingUserId} order by created_at
    `;
    expect(tokens.map(({ active }) => active)).toEqual([false, true]);
    const audit = await listAuditEvents(actor(), {
      q: "recovery_link_generated",
    });
    expect(audit.items.some(({ targetId }) => targetId === pendingUserId)).toBe(
      true,
    );
    expect(audit.items[0]).not.toHaveProperty("metadata");
  });
});

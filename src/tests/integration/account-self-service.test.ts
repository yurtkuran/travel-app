import { randomUUID } from "node:crypto";

import { hashPassword, verifyPassword } from "better-auth/crypto";
import { afterAll, beforeAll, describe, expect, test } from "vitest";

import { getSqlClient } from "@/db/client";
import {
  AccountSelfServiceError,
  changeOwnPassword,
  listOwnSessions,
  revokeOwnSession,
  updateOwnProfile,
} from "@/features/auth/server/account-self-service";

import { createTestUser } from "../factories/database";

const sql = getSqlClient();
const currentPassword = "Current-account-password-123!";
const newPassword = "Updated-account-password-456!";
let currentSessionId: string;
let otherUserId: string;
let userId: string;

const actor = () => ({ id: userId, role: "user" as const });

async function createSession(ownerId: string, userAgent: string) {
  const id = randomUUID();
  await sql`
    insert into session (id, token, user_id, expires_at, user_agent)
    values (${id}, ${randomUUID()}, ${ownerId}, now() + interval '1 day', ${userAgent})
  `;
  return id;
}

describe("account self-service", () => {
  beforeAll(async () => {
    const [user, other] = await Promise.all([
      createTestUser(sql, "Account Owner"),
      createTestUser(sql, "Other Account"),
    ]);
    userId = user.id;
    otherUserId = other.id;
    const password = await hashPassword(currentPassword);
    await sql`
      insert into account (id, account_id, provider_id, user_id, password)
      values (${randomUUID()}, ${userId}, 'credential', ${userId}, ${password})
    `;
    currentSessionId = await createSession(userId, "Current test browser");
  });

  afterAll(async () => {
    const ids = [userId, otherUserId].filter(Boolean);
    if (ids.length) {
      await sql`delete from audit_events where actor_user_id in ${sql(ids)} or target_id in ${sql(ids)}`;
      await sql`delete from "user" where id in ${sql(ids)}`;
    }
    await sql.end();
  });

  test("updates only the owner's profile", async () => {
    await updateOwnProfile(actor(), { name: "Updated Account Owner" });
    const users = await sql<{ id: string; name: string }[]>`
      select id, name from "user" where id in (${userId}, ${otherUserId})
    `;
    expect(users.find(({ id }) => id === userId)?.name).toBe(
      "Updated Account Owner",
    );
    expect(users.find(({ id }) => id === otherUserId)?.name).toBe(
      "Other Account",
    );
  });

  test("lists only redacted sessions belonging to the owner", async () => {
    const secondSessionId = await createSession(
      userId,
      "Secondary test browser",
    );
    await createSession(otherUserId, "Other user's browser");
    const sessions = await listOwnSessions(actor(), currentSessionId);
    expect(sessions.map(({ id }) => id)).toEqual(
      expect.arrayContaining([currentSessionId, secondSessionId]),
    );
    expect(sessions).toHaveLength(2);
    expect(sessions[0]).not.toHaveProperty("token");
    expect(sessions.find(({ id }) => id === currentSessionId)?.isCurrent).toBe(
      true,
    );
  });

  test("revokes only another session owned by the actor", async () => {
    const ownedSessionId = await createSession(userId, "Revocable browser");
    const otherSessionId = await createSession(
      otherUserId,
      "Protected browser",
    );
    await revokeOwnSession(actor(), ownedSessionId, currentSessionId);
    await expect(
      revokeOwnSession(actor(), currentSessionId, currentSessionId),
    ).rejects.toBeInstanceOf(AccountSelfServiceError);
    await expect(
      revokeOwnSession(actor(), otherSessionId, currentSessionId),
    ).rejects.toBeInstanceOf(AccountSelfServiceError);
    const remaining = await sql<{ id: string }[]>`
      select id from session where id in (${ownedSessionId}, ${otherSessionId})
    `;
    expect(remaining.map(({ id }) => id)).toEqual([otherSessionId]);
  });

  test("changes the password and revokes every other session", async () => {
    await createSession(userId, "Password-change browser");
    await expect(
      changeOwnPassword(actor(), currentSessionId, {
        confirmation: newPassword,
        currentPassword: "Incorrect-password-123!",
        newPassword,
      }),
    ).rejects.toBeInstanceOf(AccountSelfServiceError);
    await changeOwnPassword(actor(), currentSessionId, {
      confirmation: newPassword,
      currentPassword,
      newPassword,
    });
    const [credential] = await sql<{ password: string }[]>`
      select password from account
       where user_id=${userId} and provider_id='credential'
    `;
    expect(
      credential &&
        (await verifyPassword({
          hash: credential.password,
          password: newPassword,
        })),
    ).toBe(true);
    const sessions = await sql<{ id: string }[]>`
      select id from session where user_id=${userId}
    `;
    expect(sessions.map(({ id }) => id)).toEqual([currentSessionId]);
  });
});

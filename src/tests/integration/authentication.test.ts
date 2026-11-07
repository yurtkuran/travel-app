import { randomUUID } from "node:crypto";

import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { getSqlClient } from "@/db/client";
import { setUserSuspended } from "@/features/auth/server/account-administration";
import { getAuth } from "@/features/auth/server/auth";
import { bootstrapFirstAdmin } from "@/features/auth/server/bootstrap-admin";
import {
  consumeSetupToken,
  provisionUser,
  SetupTokenError,
} from "@/features/auth/server/setup-tokens";

const sql = getSqlClient();
const baseUrl = "http://localhost:3000";

function request(path: string, body: Record<string, unknown>) {
  return new Request(`${baseUrl}/api/auth${path}`, {
    body: JSON.stringify(body),
    headers: { "Content-Type": "application/json", Origin: baseUrl },
    method: "POST",
  });
}

describe("authentication lifecycle", () => {
  let adminId: string;
  let provisionedEmail: string;
  let provisionedUserId: string;
  let sessionCookie: string;
  const password = "A-strong-test-password-123!";

  beforeAll(async () => {
    const admin = await bootstrapFirstAdmin({
      email: `admin-${randomUUID()}@example.test`,
      name: "Test Administrator",
      password,
    });
    adminId = admin.userId;
  });

  afterAll(async () => {
    if (provisionedUserId) {
      await sql`delete from "user" where id = ${provisionedUserId}`;
    }
    if (adminId) await sql`delete from "user" where id = ${adminId}`;
    await sql`
      delete from audit_events
       where target_id in (${provisionedUserId || "none"}, ${adminId || "none"})
    `;
    await sql.end();
  });

  it("rejects public email signup", async () => {
    const response = await getAuth().handler(
      request("/sign-up/email", {
        email: `public-signup-${randomUUID()}@example.test`,
        name: "Public Signup",
        password,
      }),
    );
    expect(response.ok).toBe(false);
  });

  it("provisions a user and consumes a setup link exactly once", async () => {
    provisionedEmail = `provisioned-${randomUUID()}@example.test`;
    const result = await provisionUser(
      { id: adminId, role: "admin" },
      { email: provisionedEmail, name: "Provisioned User" },
    );
    provisionedUserId = result.userId;
    const token = new URL(result.setupUrl).searchParams.get("token");
    if (!token) throw new Error("Setup URL did not contain a token");

    await consumeSetupToken(token, password);
    await expect(consumeSetupToken(token, password)).rejects.toBeInstanceOf(
      SetupTokenError,
    );

    const [account] = await sql<{ count: number }[]>`
      select count(*)::integer as count
        from account
       where user_id = ${provisionedUserId}
         and provider_id = 'credential'
         and password is not null
    `;
    expect(account?.count).toBe(1);
  });

  it("signs in through Better Auth and creates a PostgreSQL session", async () => {
    const response = await getAuth().handler(
      request("/sign-in/email", { email: provisionedEmail, password }),
    );
    expect(response.status).toBe(200);

    sessionCookie = response.headers
      .getSetCookie()
      .map((cookie) => cookie.split(";", 1)[0])
      .join("; ");
    expect(sessionCookie).toContain("traveltrove.session_token=");

    const sessions = await sql<{ count: number }[]>`
      select count(*)::integer as count from session where user_id = ${provisionedUserId}
    `;
    expect(sessions[0]?.count).toBe(1);
  });

  it("revokes sessions when an administrator suspends an account", async () => {
    await setUserSuspended(
      { id: adminId, role: "admin" },
      provisionedUserId,
      true,
      "Integration test",
    );

    const response = await getAuth().handler(
      new Request(`${baseUrl}/api/auth/get-session`, {
        headers: { Cookie: sessionCookie },
      }),
    );
    expect(await response.json()).toBeNull();
  });

  it("protects the final active administrator", async () => {
    await expect(
      setUserSuspended(
        { id: "another-admin", role: "admin" },
        adminId,
        true,
        "Must be rejected",
      ),
    ).rejects.toThrow("final active administrator");
  });
});

import { randomUUID } from "node:crypto";

import { expect, test } from "@playwright/test";
import { hashPassword } from "better-auth/crypto";

import { getSqlClient } from "@/db/client";
import {
  isSetupTokenUsable,
  provisionUser,
} from "@/features/auth/server/setup-tokens";
import type { Role } from "@/features/auth/permissions";

const sql = getSqlClient();
const password = "A-strong-browser-password-123!";

async function createCredentialUser(role: Role) {
  const id = `e2e-${role}-${randomUUID()}`;
  const email = `${id}@example.test`;
  const passwordHash = await hashPassword(password);

  await sql.begin(async (transaction) => {
    await transaction`
      insert into "user" (id, name, email, email_verified, role)
      values (${id}, ${role === "admin" ? "Browser Admin" : "Browser User"}, ${email}, true, ${role})
    `;
    await transaction`
      insert into account (id, account_id, provider_id, user_id, password)
      values (${randomUUID()}, ${id}, 'credential', ${id}, ${passwordHash})
    `;
  });

  return { email, id };
}

async function signIn(page: import("@playwright/test").Page, email: string) {
  await page.goto("/sign-in");
  await page.getByLabel("Email address").fill(email);
  await page.getByLabel("Password", { exact: true }).fill(password);
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page).toHaveURL(/\/my$/);
}

test.describe("authentication boundaries", () => {
  test.describe.configure({ mode: "serial" });

  let admin: { email: string; id: string };
  let user: { email: string; id: string };
  let setupUserId: string | undefined;

  test.beforeAll(async () => {
    admin = await createCredentialUser("admin");
    user = await createCredentialUser("user");
  });

  test.afterAll(async () => {
    const userIds = [admin?.id, user?.id, setupUserId].filter(
      (value): value is string => Boolean(value),
    );
    if (userIds.length) {
      await sql`delete from "user" where id in ${sql(userIds)}`;
      await sql`delete from audit_events where target_id in ${sql(userIds)}`;
    }
    await sql.end();
  });

  test("redirects a guest from administration to sign in", async ({ page }) => {
    await page.goto("/admin");
    await expect(page).toHaveURL(/\/sign-in\?returnTo=%2Fadmin$/);
  });

  test("allows a user into personal activity but returns 403 for administration", async ({
    page,
  }) => {
    await signIn(page, user.email);
    await expect(
      page.getByRole("heading", { name: /welcome, browser user/i }),
    ).toBeVisible();
    await expect(page.getByRole("link", { name: "Add a place" })).toBeVisible();
    await expect(
      page.getByRole("link", { name: "Administration" }),
    ).toHaveCount(0);

    const response = await page.goto("/admin");
    expect(response?.status()).toBe(403);
    await expect(
      page.getByRole("heading", { name: "Access denied" }),
    ).toBeVisible();
  });

  test("allows an administrator into the protected dashboard", async ({
    page,
  }) => {
    await signIn(page, admin.email);
    await page.goto("/admin");
    await expect(
      page.getByRole("heading", { name: "Admin dashboard" }),
    ).toBeVisible();
    await expect(
      page.getByRole("link", { name: "Administration" }),
    ).toHaveAttribute("aria-current", "page");
    await expect(
      page.getByRole("navigation", { name: "Administration navigation" }),
    ).toContainText("Users");

    await page.goto("/admin/places");
    const breadcrumbs = page.getByRole("navigation", { name: "Breadcrumb" });
    await expect(
      breadcrumbs.getByRole("link", { name: "Administration" }),
    ).toHaveAttribute("href", "/admin");
    await expect(
      breadcrumbs.getByText("Places", { exact: true }),
    ).toHaveAttribute("aria-current", "page");
  });

  test("exchanges and consumes a one-time setup link", async ({ page }) => {
    const provisioned = await provisionUser(
      { id: admin.id, role: "admin" },
      {
        email: `setup-${randomUUID()}@example.test`,
        name: "Setup Browser User",
      },
    );
    setupUserId = provisioned.userId;
    const token = new URLSearchParams(
      new URL(provisioned.setupUrl).hash.slice(1),
    ).get("token");
    expect(token).toBeTruthy();
    await expect(isSetupTokenUsable(token ?? "")).resolves.toBe(true);

    const setupRequestPromise = page.waitForRequest(
      (request) => new URL(request.url()).pathname === "/account/setup",
    );
    await page.goto(provisioned.setupUrl);
    const setupRequest = await setupRequestPromise;
    expect(setupRequest.url()).not.toContain(token ?? "missing-token");
    await expect(page).toHaveURL(/\/account\/setup$/);
    const passwordInput = page.getByLabel("Password", { exact: true });
    await expect(passwordInput).toBeVisible();
    await passwordInput.fill(password);
    await page.getByLabel("Confirm password").fill(password);
    await page.getByRole("button", { name: "Complete account setup" }).click();
    await expect(page).toHaveURL(/\/sign-in\?setup=complete$/);

    await signIn(page, provisioned.email);
    await expect(
      page.getByRole("heading", { name: /welcome, setup browser user/i }),
    ).toBeVisible();
  });
});

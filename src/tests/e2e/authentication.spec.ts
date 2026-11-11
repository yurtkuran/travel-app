import { randomUUID } from "node:crypto";
import { rm } from "node:fs/promises";
import path from "node:path";

import { expect, test } from "@playwright/test";
import { hashPassword } from "better-auth/crypto";
import sharp from "sharp";

import { getSqlClient } from "@/db/client";
import {
  isSetupTokenUsable,
  provisionUser,
} from "@/features/auth/server/setup-tokens";
import type { Role } from "@/features/auth/permissions";

const sql = getSqlClient();
const password = "A-strong-browser-password-123!";
const taxonomySuffix = randomUUID();
const taxonomyCityName = `Browser City ${taxonomySuffix}`;
const taxonomyCategoryName = `Browser Category ${taxonomySuffix}`;

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
  const signInButton = page.getByRole("button", { name: "Sign in" });
  await expect(signInButton).toBeEnabled({ timeout: 15_000 });
  await page.getByLabel("Email address").fill(email);
  await page.getByLabel("Password", { exact: true }).fill(password);
  const [authResponse] = await Promise.all([
    page.waitForResponse(
      (response) =>
        new URL(response.url()).pathname === "/api/auth/sign-in/email",
    ),
    signInButton.click(),
  ]);
  expect(
    authResponse.status(),
    `Sign-in response: ${await authResponse.text()}`,
  ).toBe(200);
  await expect
    .poll(async () =>
      (await page.context().cookies()).some((cookie) =>
        cookie.name.startsWith("traveltrove.session_token"),
      ),
    )
    .toBe(true);
  await expect(page).toHaveURL(/\/my$/);
}

test.describe("authentication boundaries", () => {
  test.describe.configure({ mode: "serial" });

  let admin: { email: string; id: string };
  let administratedUserId: string | undefined;
  let browserSubmissionId: string | undefined;
  let user: { email: string; id: string };
  let setupUserId: string | undefined;

  test.beforeAll(async () => {
    admin = await createCredentialUser("admin");
    user = await createCredentialUser("user");
  });

  test.afterAll(async () => {
    if (browserSubmissionId) {
      const proposals = await sql<{ id: string }[]>`
        select id from place_change_proposals where place_id = ${browserSubmissionId}
      `;
      const media = await sql<{ id: string; storageKey: string }[]>`
        select id, storage_key as "storageKey" from media where place_id = ${browserSubmissionId}
      `;
      const mediaRoot = path.resolve(
        process.env.MEDIA_ROOT ?? ".local-data/media",
      );
      await Promise.allSettled(
        media.flatMap(({ storageKey }) =>
          [
            storageKey,
            storageKey.replace(/\/display\.webp$/, "/thumbnail.webp"),
          ].map((key) => rm(path.join(mediaRoot, key), { force: true })),
        ),
      );
      await sql`delete from media where place_id = ${browserSubmissionId}`;
      if (media.length) {
        await sql`delete from audit_events where target_type = 'media' and target_id in ${sql(media.map(({ id }) => id))}`;
      }
      if (proposals.length) {
        await sql`delete from audit_events where target_type = 'proposal' and target_id in ${sql(proposals.map(({ id }) => id))}`;
        await sql`delete from place_change_proposals where id in ${sql(proposals.map(({ id }) => id))}`;
      }
      await sql`delete from audit_events where target_type = 'place' and target_id = ${browserSubmissionId}`;
      await sql`delete from visits where place_id = ${browserSubmissionId}`;
      await sql`delete from reviews where place_id = ${browserSubmissionId}`;
      await sql`delete from places where id = ${browserSubmissionId}`;
    }
    const userIds = [
      admin?.id,
      user?.id,
      setupUserId,
      administratedUserId,
    ].filter((value): value is string => Boolean(value));
    if (userIds.length) {
      await sql`delete from "user" where id in ${sql(userIds)}`;
      await sql`delete from audit_events where target_id in ${sql(userIds)}`;
    }
    await sql`
      delete from audit_events
       where target_id in (
         select id::text from cities where name = ${taxonomyCityName}
         union all
         select id::text from categories where name = ${taxonomyCategoryName}
       )
    `;
    await sql`delete from cities where name = ${taxonomyCityName}`;
    await sql`delete from categories where name = ${taxonomyCategoryName}`;
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
    const administrationSummary = page.getByRole("region", {
      name: "Administration summary",
    });
    await expect(
      administrationSummary.getByRole("link", {
        name: /pending submissions/i,
      }),
    ).toHaveAttribute("href", "/admin/submissions");
    await expect(
      administrationSummary.getByRole("link", { name: /change proposals/i }),
    ).toHaveAttribute("href", "/admin/proposals");
    await expect(
      administrationSummary.getByRole("link", { name: /hidden reviews/i }),
    ).toHaveAttribute("href", "/admin/reviews");
    await expect(
      page.getByRole("heading", { name: "Needs attention" }),
    ).toBeVisible();
    await expect(
      page.getByRole("heading", { name: "Recent administrative activity" }),
    ).toBeVisible();

    await page.goto("/admin/places");
    const breadcrumbs = page.getByRole("navigation", { name: "Breadcrumb" });
    await expect(
      breadcrumbs.getByRole("link", { name: "Administration" }),
    ).toHaveAttribute("href", "/admin");
    await expect(
      breadcrumbs.getByText("Places", { exact: true }),
    ).toHaveAttribute("aria-current", "page");
  });

  test("allows an administrator to create city and category taxonomy", async ({
    page,
  }) => {
    await signIn(page, admin.email);
    await page.goto("/admin/cities");
    await page.getByLabel("City name").fill(taxonomyCityName);
    await page.getByLabel("State or region").fill("Browser Region");
    await page.getByLabel("Country", { exact: true }).fill("United States");
    await page.getByLabel("Country code", { exact: true }).fill("US");
    await page.getByRole("button", { name: "Add city" }).click();
    await expect(page.getByRole("status")).toContainText(
      `${taxonomyCityName} was created`,
    );
    await expect(
      page.getByRole("cell", { name: taxonomyCityName }),
    ).toBeVisible();

    await page.goto("/admin/categories");
    await page.getByLabel("Category name").fill(taxonomyCategoryName);
    await page
      .getByLabel("Description")
      .fill("A category created by the browser workflow.");
    await page.getByLabel("Atmosphere").check();
    await page.getByLabel("Service").check();
    await page.getByRole("button", { name: "Add category" }).click();
    await expect(page.getByRole("status")).toContainText(
      `${taxonomyCategoryName} was created`,
    );
    await expect(
      page.getByRole("cell", { name: new RegExp(taxonomyCategoryName) }),
    ).toBeVisible();
    const categoryRow = page
      .getByRole("row")
      .filter({ hasText: taxonomyCategoryName });
    await expect(
      categoryRow.getByRole("cell", {
        exact: true,
        name: "Atmosphere, Service",
      }),
    ).toBeVisible();
  });

  test("allows a user to submit a place with private provenance", async ({
    page,
  }) => {
    const placeName = `Browser Place ${taxonomySuffix}`;
    await signIn(page, user.email);
    await page.goto("/my/submissions/new");
    await page.getByLabel("Place name").fill(placeName);
    await page.getByLabel("Source type").selectOption("publication");
    await page.getByLabel("Source name").fill("Browser Travel Journal");
    await page
      .getByLabel("Source URL")
      .fill("https://example.com/browser-travel-journal");
    await page
      .getByLabel("Submission notes")
      .fill("Private provenance for the submitter and administrators.");
    await page.getByRole("button", { name: "Save draft" }).click();

    await expect(page).toHaveURL(
      /\/my\/submissions\/[0-9a-f-]+\?created=draft$/,
    );
    browserSubmissionId = new URL(page.url()).pathname.split("/").at(-1);
    await expect(page.getByRole("status")).toContainText(
      "private draft was saved",
    );
    await expect(page.getByText("Draft", { exact: true })).toBeVisible();
    await page.getByRole("link", { name: "Edit draft" }).click();
    await expect(page).toHaveURL(/\?edit=true$/);
    await expect(page.getByLabel("Source name")).toHaveValue(
      "Browser Travel Journal",
    );
    await page
      .getByLabel("Short summary")
      .fill("A change that has not been saved yet.");
    page.once("dialog", async (dialog) => {
      expect(dialog.message()).toContain("unsaved changes");
      await dialog.dismiss();
    });
    await page.getByRole("link", { name: "Cancel editing" }).click();
    await expect(page).toHaveURL(/\?edit=true$/);
    await expect(page.getByLabel("Short summary")).toHaveValue(
      "A change that has not been saved yet.",
    );
    await page.getByLabel("City", { exact: true }).selectOption({
      label: `${taxonomyCityName}, Browser Region, United States`,
    });
    await page
      .getByLabel("Category", { exact: true })
      .selectOption({ label: taxonomyCategoryName });
    await page.getByLabel("Type or cuisine").fill("Browser-tested place");
    await page
      .getByLabel("Short summary")
      .fill("A place submitted through the complete browser workflow.");
    await page.getByRole("button", { name: "Submit for review" }).click();

    await expect(page).toHaveURL(
      /\/my\/submissions\/[0-9a-f-]+\?updated=submitted$/,
    );
    await expect(page.getByRole("status")).toContainText(
      "submitted for administrative review",
    );
    await expect(page.getByRole("heading", { name: placeName })).toBeVisible();
    await expect(
      page.getByText("Pending review", { exact: true }),
    ).toBeVisible();
    await expect(page.getByText("Browser Travel Journal")).toBeVisible();
    await expect(
      page.getByText("Visible only to you and administrators."),
    ).toBeVisible();
  });

  test("allows an administrator to publish without exposing provenance", async ({
    page,
  }) => {
    expect(browserSubmissionId).toBeTruthy();
    await signIn(page, admin.email);
    await page.goto(`/admin/submissions/${browserSubmissionId}`);
    await expect(
      page.getByRole("heading", { name: `Browser Place ${taxonomySuffix}` }),
    ).toBeVisible();
    await expect(page.getByText("Browser Travel Journal")).toBeVisible();
    await expect(
      page.getByText(
        "Private provenance for the submitter and administrators.",
      ),
    ).toBeVisible();

    await page.getByRole("button", { name: "Approve and publish" }).click();
    await expect(page).toHaveURL(/\/places\/[0-9a-f-]+\/browser-place-/);
    const publicUrl = new URL(page.url());
    expect(publicUrl.searchParams.get("published")).toBe("true");

    await page.context().clearCookies();
    await page.goto(publicUrl.pathname);
    await expect(
      page.getByRole("heading", { name: `Browser Place ${taxonomySuffix}` }),
    ).toBeVisible();
    await expect(
      page.getByText(
        "A place submitted through the complete browser workflow.",
      ),
    ).toBeVisible();
    await expect(page.getByText("Browser Travel Journal")).toHaveCount(0);
    await expect(
      page.getByText(
        "Private provenance for the submitter and administrators.",
      ),
    ).toHaveCount(0);
  });

  test("keeps a user's visit ratings and notes private", async ({ page }) => {
    expect(browserSubmissionId).toBeTruthy();
    await signIn(page, user.email);
    await page.goto(
      `/places/${browserSubmissionId}/browser-place-${taxonomySuffix}/visits`,
    );
    await page.getByLabel("Visit date").fill("2026-11-01");
    await page.getByLabel("Overall rating").selectOption("4");
    await page.getByLabel("Atmosphere rating (optional)").selectOption("5");
    await page
      .getByLabel("Private notes (optional)")
      .fill("A private browser visit snapshot.");
    await page.getByRole("button", { name: "Record visit" }).click();
    await expect(page).toHaveURL(/\/visits\?created=true$/);
    await expect(page.getByRole("status")).toContainText("Visit recorded");
    await expect(
      page
        .getByRole("paragraph")
        .filter({ hasText: /^A private browser visit snapshot\.$/ }),
    ).toBeVisible();

    await page.goto("/my/visits");
    await expect(
      page.getByRole("cell", { name: `Browser Place ${taxonomySuffix}` }),
    ).toBeVisible();

    await page.context().clearCookies();
    await page.goto(
      `/places/${browserSubmissionId}/browser-place-${taxonomySuffix}`,
    );
    await expect(
      page.getByText("A private browser visit snapshot."),
    ).toHaveCount(0);
  });

  test("publishes and moderates a public review without using visit ratings", async ({
    page,
  }) => {
    expect(browserSubmissionId).toBeTruthy();
    const placePath = `/places/${browserSubmissionId}/browser-place-${taxonomySuffix}`;
    await signIn(page, user.email);
    await page.goto(`${placePath}/review`);
    await page.getByLabel("Overall rating").selectOption("5");
    await page.getByLabel("Service rating (optional)").selectOption("4");
    const reviewText = `A public browser review ${taxonomySuffix}.`;
    await page.getByLabel("Review text (optional)").fill(reviewText);
    await page.getByRole("button", { name: "Publish review" }).click();
    await expect(page).toHaveURL(/\/review\?saved=true$/);

    await page.context().clearCookies();
    await page.goto(placePath);
    await expect(
      page.getByRole("heading", { name: "5 out of 5" }),
    ).toBeVisible();
    await expect(page.getByText(reviewText)).toBeVisible();
    await expect(
      page.getByText("A private browser visit snapshot."),
    ).toHaveCount(0);

    await signIn(page, admin.email);
    await page.goto("/admin/reviews");
    const reviewRow = page.getByRole("row").filter({ hasText: reviewText });
    await reviewRow.getByRole("button", { name: "Hide" }).click();
    await expect(reviewRow).toContainText("hidden");

    await page.context().clearCookies();
    await page.goto(placePath);
    await expect(
      page.getByRole("heading", { name: "Not yet rated" }),
    ).toBeVisible();
    await expect(page.getByText(reviewText)).toHaveCount(0);
  });

  test("allows an administrator to edit and safely unpublish a canonical place", async ({
    page,
  }) => {
    expect(browserSubmissionId).toBeTruthy();
    const publicPath = `/places/${browserSubmissionId}/browser-place-${taxonomySuffix}`;
    await signIn(page, admin.email);
    await page.goto(`/admin/places/${browserSubmissionId}`);
    await page
      .getByLabel("Short summary")
      .fill("An administrator-updated public summary.");
    await page.getByLabel("Phone").fill("+1 212 555 0100");
    await page.getByLabel("Latitude").fill("40.7128");
    await page.getByLabel("Longitude").fill("-74.0060");
    await page
      .getByLabel("Official website")
      .fill("https://example.com/browser-place");
    await page
      .getByLabel("Map listing")
      .fill("https://maps.example.com/browser-place");
    await page.getByRole("button", { name: "Save changes" }).click();
    await expect(page).toHaveURL(/\?updated=true$/);
    await page.goto(publicPath);
    await expect(
      page.getByText("An administrator-updated public summary."),
    ).toBeVisible();
    await expect(page).toHaveTitle(
      new RegExp(`Browser Place ${taxonomySuffix}`),
    );
    await expect(
      page.getByRole("link", { name: "Visit official website" }),
    ).toHaveAttribute("href", "https://example.com/browser-place");
    await expect(
      page.getByRole("link", { name: "View on map" }),
    ).toHaveAttribute("href", "https://maps.example.com/browser-place");
    await expect(
      page.getByRole("link", { name: "+1 212 555 0100" }),
    ).toHaveAttribute("href", "tel:+12125550100");

    await page.goto(`/admin/places/${browserSubmissionId}`);
    await page.getByRole("button", { name: "Unpublish" }).click();
    await expect(
      page.getByRole("heading", {
        name: `Unpublish Browser Place ${taxonomySuffix}?`,
      }),
    ).toBeVisible();
    await page.getByRole("button", { name: "Cancel" }).click();
    await expect(
      page.getByRole("heading", {
        name: `Unpublish Browser Place ${taxonomySuffix}?`,
      }),
    ).not.toBeVisible();
    await page.getByRole("button", { name: "Unpublish" }).click();
    await page.getByRole("button", { name: "Unpublish place" }).click();
    await expect(page).toHaveURL(/publication=unpublished$/);
    await page.goto(publicPath);
    await expect(
      page.getByRole("heading", {
        name: "This place is not in the archive.",
      }),
    ).toBeVisible();
    await expect(
      page.getByRole("heading", { name: `Browser Place ${taxonomySuffix}` }),
    ).toHaveCount(0);

    await page.goto(`/admin/places/${browserSubmissionId}`);
    await page.getByRole("button", { name: "Republish" }).click();
    await expect(page).toHaveURL(/publication=published$/);
    await page.goto(publicPath);
    await expect(
      page.getByRole("heading", { name: `Browser Place ${taxonomySuffix}` }),
    ).toBeVisible();

    await page.goto(
      `/admin/places?q=${encodeURIComponent(`Browser Place ${taxonomySuffix}`)}&status=published&sort=name`,
    );
    await expect(page.getByLabel("Search places")).toHaveValue(
      `Browser Place ${taxonomySuffix}`,
    );
    await expect(page.getByLabel("Status")).toHaveValue("published");
    await expect(page.getByLabel("Sort")).toHaveValue("name");
    const repositoryRow = page
      .getByRole("row")
      .filter({ hasText: `Browser Place ${taxonomySuffix}` });
    await expect(repositoryRow).toContainText("published");
    await expect(page.getByText("Page 1 of 1 · 1 total")).toBeVisible();
  });

  test("uploads, publishes, and removes optimized place media", async ({
    page,
  }) => {
    expect(browserSubmissionId).toBeTruthy();
    const publicPath = `/places/${browserSubmissionId}/browser-place-${taxonomySuffix}`;
    const source = await sharp({
      create: {
        background: { b: 80, g: 120, r: 180 },
        channels: 3,
        height: 600,
        width: 900,
      },
    })
      .png()
      .toBuffer();

    await signIn(page, admin.email);
    await page.goto(`/admin/places/${browserSubmissionId}`);
    await page.getByLabel("Image", { exact: true }).setInputFiles({
      buffer: source,
      mimeType: "image/png",
      name: "browser-place.png",
    });
    await page
      .getByLabel("Alternative text")
      .fill("A warm abstract travel scene");
    await page.getByLabel("Caption (optional)").fill("Browser media caption");
    await page.getByRole("button", { name: "Upload image" }).click();
    await expect(page).toHaveURL(/media=uploaded$/);
    await expect(
      page.getByRole("img", { name: "A warm abstract travel scene" }),
    ).toBeVisible();

    await page.context().clearCookies();
    await page.goto(publicPath);
    await expect(
      page.getByRole("img", { name: "A warm abstract travel scene" }),
    ).toBeVisible();
    await expect(page.getByText("Browser media caption")).toBeVisible();

    await signIn(page, admin.email);
    await page.goto(`/admin/places/${browserSubmissionId}`);
    const mediaCard = page
      .getByRole("article")
      .filter({ hasText: "Browser media caption" });
    await mediaCard.getByRole("button", { name: "Remove" }).click();
    await mediaCard.getByRole("button", { name: "Remove image" }).click();
    await expect(page).toHaveURL(/media=deleted$/);

    await page.context().clearCookies();
    await page.goto(publicPath);
    await expect(
      page.getByRole("img", { name: "A warm abstract travel scene" }),
    ).toHaveCount(0);
  });

  test("discovers published places without exposing private activity", async ({
    page,
  }) => {
    expect(browserSubmissionId).toBeTruthy();
    const placeName = `Browser Place ${taxonomySuffix}`;

    await page.goto("/places");
    await page.getByLabel("Search public places").fill(placeName);
    await page.getByRole("button", { name: "Apply filters" }).click();
    await expect(page).toHaveURL(/\/places\?q=Browser\+Place/);
    const guestCard = page.getByRole("article").filter({ hasText: placeName });
    await expect(
      guestCard.getByRole("heading", { name: placeName }),
    ).toBeVisible();
    await expect(guestCard).toContainText("Not yet rated");
    await expect(guestCard).not.toContainText("Your visits");

    await page.goto("/cities");
    await page
      .getByRole("link", { name: new RegExp(taxonomyCityName) })
      .click();
    await expect(
      page.getByRole("heading", { name: taxonomyCityName }),
    ).toBeVisible();
    await expect(page.getByRole("heading", { name: placeName })).toBeVisible();

    await page.goto("/categories");
    await page
      .getByRole("link", { name: new RegExp(taxonomyCategoryName) })
      .click();
    await expect(
      page.getByRole("heading", { name: taxonomyCategoryName }),
    ).toBeVisible();
    await expect(page.getByRole("heading", { name: placeName })).toBeVisible();

    await signIn(page, user.email);
    await page.goto(`/places?q=${encodeURIComponent(placeName)}`);
    const ownerCard = page.getByRole("article").filter({ hasText: placeName });
    await expect(ownerCard).toContainText("Your visits · 1");
    await expect(ownerCard).not.toContainText("private browser visit snapshot");
  });

  test("submits and approves a published-place change proposal", async ({
    page,
  }) => {
    expect(browserSubmissionId).toBeTruthy();
    const placeName = `Browser Place ${taxonomySuffix}`;
    const placePath = `/places/${browserSubmissionId}/browser-place-${taxonomySuffix}`;
    const proposedSummary = `A browser-approved proposed summary ${taxonomySuffix}.`;

    await signIn(page, user.email);
    await page.goto(placePath);
    await page.getByRole("link", { name: "Suggest an edit" }).click();
    await expect(
      page.getByRole("heading", { name: `Suggest an edit to ${placeName}` }),
    ).toBeVisible();
    await page.getByLabel("Short summary").fill(proposedSummary);
    await page
      .getByLabel("Notes for the administrator")
      .fill("Private evidence for the proposal reviewer.");
    await page.getByRole("button", { name: "Submit proposed edit" }).click();
    await expect(page).toHaveURL(/\/my\/proposals\/[0-9a-f-]+\?created=true$/);
    await expect(page.getByRole("status")).toContainText(
      "submitted for administrative review",
    );
    await expect(page.getByText(proposedSummary)).toBeVisible();

    await page.context().clearCookies();
    await signIn(page, admin.email);
    await page.goto("/admin/proposals");
    const proposalRow = page.getByRole("row").filter({ hasText: placeName });
    await proposalRow.getByRole("link", { name: "Compare" }).click();
    await expect(
      page.getByRole("heading", { name: `Edit to ${placeName}` }),
    ).toBeVisible();
    await expect(
      page.getByText("Private evidence for the proposal reviewer."),
    ).toBeVisible();
    await page.getByRole("button", { name: "Approve changes" }).click();
    await expect(page).toHaveURL(/proposal=approved$/);
    await expect(page.getByText(proposedSummary)).toBeVisible();
  });

  test("provisions and manages an account without exposing private activity", async ({
    page,
  }) => {
    const managedEmail = `managed-${taxonomySuffix}@example.test`;
    await page.context().clearCookies();
    await signIn(page, admin.email);
    await page.goto("/admin/users/new");
    await page.getByLabel("Name").fill("Managed Browser User");
    await page.getByLabel("Email address").fill(managedEmail);
    await page.getByRole("button", { name: "Provision user" }).click();
    await expect(page.getByRole("status")).toContainText(
      /single-use link ready/i,
    );
    const setupLink = page.getByLabel("Setup link");
    await expect(setupLink).toHaveValue(/\/account\/setup#token=/);
    const manageLink = page.getByRole("link", { name: "Manage account" });
    administratedUserId = (await manageLink.getAttribute("href"))
      ?.split("/")
      .at(-1);
    expect(administratedUserId).toBeTruthy();
    await manageLink.click();
    await expect(
      page.getByRole("heading", { name: "Managed Browser User" }),
    ).toBeVisible();
    await page
      .getByRole("button", { name: "Generate replacement link" })
      .click();
    await expect(page.getByRole("status")).toContainText(
      "new recovery link was generated",
    );

    await page.getByRole("button", { name: "Suspend account" }).click();
    await page.getByLabel("Reason").fill("Browser lifecycle verification");
    await page.getByRole("button", { name: "Suspend account" }).last().click();
    await expect(page).toHaveURL(/updated=suspended$/);
    await page.getByRole("button", { name: "Restore account" }).click();
    await expect(page).toHaveURL(/updated=restored$/);

    await page.getByRole("button", { name: "Delete account" }).click();
    await page.getByLabel(`Type ${managedEmail} to confirm`).fill(managedEmail);
    await page.getByRole("button", { name: "Permanently delete" }).click();
    await expect(page).toHaveURL(/\/admin\/users\?deleted=true$/);
    await expect(page.getByRole("status")).toContainText(
      "private activity were deleted",
    );

    await page.goto(
      `/admin/audit?q=${encodeURIComponent(administratedUserId ?? "")}`,
    );
    const deletionEvent = page
      .getByRole("row")
      .filter({ hasText: "user · deleted" })
      .filter({ hasText: administratedUserId ?? "missing-managed-user-id" });
    await expect(deletionEvent).toBeVisible();
  });

  test("updates the signed-in profile, password, and owned sessions", async ({
    page,
  }) => {
    const updatedPassword = "Updated-browser-password-456!";
    await page.context().clearCookies();
    await signIn(page, user.email);
    await page.goto("/account");
    await page.getByLabel("Name", { exact: true }).fill("Updated Browser User");
    await page.getByRole("button", { name: "Save profile" }).click();
    await expect(page).toHaveURL(/\/account\?updated=true$/);
    await expect(page.getByRole("status")).toContainText("profile was updated");

    const secondarySessionId = randomUUID();
    await sql`
      insert into session (id, token, user_id, expires_at, user_agent)
      values (
        ${secondarySessionId},
        ${randomUUID()},
        ${user.id},
        now() + interval '1 day',
        'Secondary browser test agent'
      )
    `;
    await page.goto("/account/security");
    await expect(page.getByText("Current browser")).toBeVisible();
    const secondarySession = page
      .getByRole("article")
      .filter({ hasText: "Secondary browser test agent" });
    await secondarySession.getByRole("button", { name: "End session" }).click();
    await expect(page).toHaveURL(/updated=session$/);
    await expect(page.getByRole("status")).toContainText(
      "selected session was ended",
    );

    await page.getByLabel("Current password").fill(password);
    await page
      .getByLabel("New password", { exact: true })
      .fill(updatedPassword);
    await page.getByLabel("Confirm new password").fill(updatedPassword);
    await page.getByRole("button", { name: "Change password" }).click();
    await expect(page).toHaveURL(/updated=password$/);
    await expect(page.getByRole("status")).toContainText(
      "password was changed",
    );
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

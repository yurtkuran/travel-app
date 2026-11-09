import { randomUUID } from "node:crypto";

import { afterAll, beforeAll, describe, expect, test } from "vitest";

import { getSqlClient } from "@/db/client";
import { AuthorizationError, type Actor } from "@/features/auth/permissions";
import {
  getPublishedPlace,
  getSubmissionForModeration,
  listPendingSubmissions,
  PlaceModerationError,
  publishSubmission,
  rejectSubmission,
} from "@/features/places/server/moderation";
import {
  createPlaceDraft,
  getOwnSubmission,
} from "@/features/places/server/submissions";

import {
  createTestCity,
  createTestUser,
  seededTaxonomy,
} from "../factories/database";

const sql = getSqlClient();
const createdPlaceIds: string[] = [];
let admin: Actor;
let cityId: string;
let owner: Actor;

async function createPendingPlace(label: string) {
  const place = await createPlaceDraft(
    owner,
    {
      categoryId: seededTaxonomy.categories.restaurant,
      cityId,
      name: `${label} ${randomUUID()}`,
      shortSummary: "A proposed public summary.",
      sourceName: "A Private Source",
      sourceType: "friend",
      sourceUrl: "https://example.com/private-recommendation",
      submissionNotes: "Private moderation context.",
    },
    "submit",
  );
  createdPlaceIds.push(place.id);
  return place;
}

describe("place moderation lifecycle", () => {
  beforeAll(async () => {
    const ownerUser = await createTestUser(sql, "Moderation Owner");
    const adminUser = await createTestUser(sql, "Moderation Admin");
    const city = await createTestCity(sql);
    owner = { id: ownerUser.id, role: "user" };
    admin = { id: adminUser.id, role: "admin" };
    cityId = city.id;
  });

  afterAll(async () => {
    if (createdPlaceIds.length) {
      await sql`delete from audit_events where target_type = 'place' and target_id in ${sql(createdPlaceIds)}`;
      await sql`delete from places where id in ${sql(createdPlaceIds)}`;
    }
    if (cityId) await sql`delete from cities where id = ${cityId}`;
    if (owner?.id && admin?.id) {
      await sql`delete from "user" where id in ${sql([owner.id, admin.id])}`;
    }
    await sql.end();
  });

  test("requires moderation capability for the private review queue", async () => {
    await expect(listPendingSubmissions(owner)).rejects.toBeInstanceOf(
      AuthorizationError,
    );
    await expect(
      getSubmissionForModeration(owner, randomUUID()),
    ).rejects.toBeInstanceOf(AuthorizationError);
  });

  test("shows private provenance to administrators reviewing submissions", async () => {
    const pending = await createPendingPlace("Review Queue Place");
    const queue = await listPendingSubmissions(admin, { pageSize: 100 });
    expect(queue.items.map(({ id }) => id)).toContain(pending.id);

    const detail = await getSubmissionForModeration(admin, pending.id);
    expect(detail).toMatchObject({
      sourceName: "A Private Source",
      sourceType: "friend",
      submissionNotes: "Private moderation context.",
    });
  });

  test("publishes a submission without exposing private provenance", async () => {
    const pending = await createPendingPlace("Published Place");
    const published = await publishSubmission(admin, pending.id);
    expect(published.slug).toMatch(/^published-place-/);

    const publicPlace = await getPublishedPlace(pending.id);
    expect(publicPlace).toMatchObject({
      id: pending.id,
      shortSummary: "A proposed public summary.",
      slug: published.slug,
    });
    expect(publicPlace).not.toHaveProperty("sourceName");
    expect(publicPlace).not.toHaveProperty("submissionNotes");

    const [audit] = await sql<{ action: string }[]>`
      select action
        from audit_events
       where target_type = 'place'
         and target_id = ${pending.id}
         and action = 'place.published'
    `;
    expect(audit?.action).toBe("place.published");
    await expect(publishSubmission(admin, pending.id)).rejects.toBeInstanceOf(
      PlaceModerationError,
    );
  });

  test("returns a private rejection reason to the submitter", async () => {
    const pending = await createPendingPlace("Rejected Place");
    await rejectSubmission(
      admin,
      pending.id,
      "Please provide a more specific description.",
    );

    const owned = await getOwnSubmission(owner, pending.id);
    expect(owned).toMatchObject({
      moderationReason: "Please provide a more specific description.",
      status: "rejected",
    });
    await expect(
      rejectSubmission(admin, pending.id, "Again"),
    ).rejects.toBeInstanceOf(PlaceModerationError);
  });
});

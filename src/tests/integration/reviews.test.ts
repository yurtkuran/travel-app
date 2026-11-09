import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, test } from "vitest";
import { getSqlClient } from "@/db/client";
import type { Actor } from "@/features/auth/permissions";
import {
  deleteOwnReview,
  getOwnReview,
  getPublicRatingSummary,
  listPublicReviews,
  listReviewsForModeration,
  moderateReview,
  ReviewError,
  saveReview,
} from "@/features/reviews/server/reviews";
import { createVisit } from "@/features/visits/server/visits";
import {
  createTestCity,
  createTestPlace,
  createTestUser,
  seededTaxonomy,
} from "../factories/database";

const sql = getSqlClient();
let cityId: string;
let placeId: string;
let owner: Actor;
let other: Actor;
let admin: Actor;

describe("public review lifecycle", () => {
  beforeAll(async () => {
    const [ownerUser, otherUser, adminUser] = await Promise.all([
      createTestUser(sql, "Review Owner"),
      createTestUser(sql, "Other Reviewer"),
      createTestUser(sql, "Review Admin"),
    ]);
    const city = await createTestCity(sql);
    const place = await createTestPlace(sql, {
      cityId: city.id,
      categoryId: seededTaxonomy.categories.restaurant,
      createdByUserId: ownerUser.id,
    });
    owner = { id: ownerUser.id, role: "user" };
    other = { id: otherUser.id, role: "user" };
    admin = { id: adminUser.id, role: "admin" };
    cityId = city.id;
    placeId = place.id;
  });
  afterAll(async () => {
    if (placeId) {
      await sql`delete from visits where place_id = ${placeId}`;
      await sql`delete from reviews where place_id = ${placeId}`;
      await sql`delete from places where id = ${placeId}`;
    }
    if (cityId) await sql`delete from cities where id = ${cityId}`;
    if (owner?.id && other?.id && admin?.id)
      await sql`delete from "user" where id in ${sql([owner.id, other.id, admin.id])}`;
    await sql.end();
  });

  test("publishes one review per user with enabled dimensions", async () => {
    await saveReview(owner, placeId, {
      overallRating: 4,
      text: "A public assessment.",
      ratings: { [seededTaxonomy.dimensions.food]: 5 },
    });
    await saveReview(owner, placeId, {
      overallRating: 5,
      text: "An updated public assessment.",
      ratings: { [seededTaxonomy.dimensions.service]: 4 },
    });
    const review = await getOwnReview(owner, placeId);
    expect(review).toMatchObject({
      overallRating: 5,
      text: "An updated public assessment.",
    });
    expect(review?.dimensions).toHaveLength(1);
    const [stored] = await sql<
      { count: number }[]
    >`select count(*)::integer as count from reviews where user_id = ${owner.id} and place_id = ${placeId}`;
    expect(stored?.count).toBe(1);
  });

  test("rejects unsupported rating dimensions", async () => {
    await expect(
      saveReview(other, placeId, {
        overallRating: 3,
        text: "",
        ratings: { [randomUUID()]: 2 },
      }),
    ).rejects.toBeInstanceOf(ReviewError);
  });

  test("derives public aggregates only from visible reviews", async () => {
    await saveReview(other, placeId, {
      overallRating: 3,
      text: "Another view.",
      ratings: { [seededTaxonomy.dimensions.service]: 2 },
    });
    await createVisit(owner, placeId, {
      overallRating: 1,
      notes: "Private and excluded.",
      ratings: {},
      visitedOn: "2026-10-01",
    });
    expect(await getPublicRatingSummary(placeId)).toMatchObject({
      overall: { average: 4, count: 2 },
    });
    const otherReview = await getOwnReview(other, placeId);
    await moderateReview(admin, otherReview!.id, "hidden");
    expect(await getPublicRatingSummary(placeId)).toMatchObject({
      overall: { average: 5, count: 1 },
    });
    expect(
      (await listPublicReviews(placeId)).map(({ id }) => id),
    ).not.toContain(otherReview!.id);
  });

  test("allows admins to hide and restore but not impersonate ownership", async () => {
    const queue = await listReviewsForModeration(admin);
    const ownerReview = queue.find(
      (review) =>
        review.placeId === placeId && review.userName === "Review Owner",
    );
    expect(ownerReview).toBeTruthy();
    await expect(
      deleteOwnReview(admin, ownerReview!.id),
    ).rejects.toBeInstanceOf(ReviewError);
    const otherReview = await getOwnReview(other, placeId);
    await moderateReview(admin, otherReview!.id, "visible");
    expect((await listPublicReviews(placeId)).map(({ id }) => id)).toContain(
      otherReview!.id,
    );
  });

  test("lets an author delete only their own review", async () => {
    const review = await getOwnReview(other, placeId);
    await deleteOwnReview(other, review!.id);
    expect(await getOwnReview(other, placeId)).toBeNull();
  });
});

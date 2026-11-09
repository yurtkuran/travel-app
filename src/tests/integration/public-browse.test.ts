import { afterAll, beforeAll, describe, expect, test } from "vitest";

import { getSqlClient } from "@/db/client";
import type { Actor } from "@/features/auth/permissions";
import {
  browsePublishedPlaces,
  getPublicCity,
  listPublicCategories,
} from "@/features/places/server/browse";
import {
  getOwnReview,
  moderateReview,
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
let admin: Actor;
let owner: Actor;
let other: Actor;
let categorySlug: string;
let cityId: string;
let citySlug: string;
let publishedPlaceId: string;
let draftPlaceId: string;

describe("public place discovery", () => {
  beforeAll(async () => {
    const [ownerUser, otherUser, adminUser] = await Promise.all([
      createTestUser(sql, "Browse Owner"),
      createTestUser(sql, "Browse Other"),
      createTestUser(sql, "Browse Admin"),
    ]);
    owner = { id: ownerUser.id, role: "user" };
    other = { id: otherUser.id, role: "user" };
    admin = { id: adminUser.id, role: "admin" };

    const city = await createTestCity(sql);
    cityId = city.id;
    const [cityRecord] = await sql<{ slug: string }[]>`
      select slug from cities where id = ${cityId}
    `;
    citySlug = cityRecord!.slug;
    const [categoryRecord] = await sql<{ slug: string }[]>`
      select slug from categories
       where id = ${seededTaxonomy.categories.restaurant}
    `;
    categorySlug = categoryRecord!.slug;

    const published = await createTestPlace(sql, {
      categoryId: seededTaxonomy.categories.restaurant,
      cityId,
      createdByUserId: owner.id,
    });
    const draft = await createTestPlace(sql, {
      categoryId: seededTaxonomy.categories.restaurant,
      cityId,
      createdByUserId: owner.id,
      status: "draft",
    });
    publishedPlaceId = published.id;
    draftPlaceId = draft.id;
    await sql`
      update places
         set name = 'Needle & Compass', slug = 'needle-and-compass',
             short_summary = 'A quiet discovery test destination.',
             type_label = 'Modern restaurant'
       where id = ${publishedPlaceId}
    `;

    await saveReview(owner, publishedPlaceId, {
      overallRating: 5,
      ratings: {},
      text: "Visible public perspective.",
    });
    await saveReview(other, publishedPlaceId, {
      overallRating: 1,
      ratings: {},
      text: "Hidden public perspective.",
    });
    const hiddenReview = await getOwnReview(other, publishedPlaceId);
    await moderateReview(admin, hiddenReview!.id, "hidden");
    await createVisit(owner, publishedPlaceId, {
      notes: "Owner-only visit.",
      overallRating: 1,
      ratings: {},
      visitedOn: "2026-11-01",
    });
    await createVisit(other, publishedPlaceId, {
      notes: "Another private visit.",
      overallRating: 2,
      ratings: {},
      visitedOn: "2026-11-02",
    });
  });

  afterAll(async () => {
    if (publishedPlaceId || draftPlaceId) {
      const ids = [publishedPlaceId, draftPlaceId].filter(Boolean);
      await sql`delete from visit_ratings where visit_id in (select id from visits where place_id in ${sql(ids)})`;
      await sql`delete from visits where place_id in ${sql(ids)}`;
      await sql`delete from review_ratings where review_id in (select id from reviews where place_id in ${sql(ids)})`;
      await sql`delete from reviews where place_id in ${sql(ids)}`;
      await sql`delete from audit_events where target_id in ${sql(ids)}`;
      await sql`delete from places where id in ${sql(ids)}`;
    }
    if (cityId) await sql`delete from cities where id = ${cityId}`;
    if (owner?.id && other?.id && admin?.id) {
      await sql`delete from "user" where id in ${sql([owner.id, other.id, admin.id])}`;
    }
    await sql.end();
  });

  test("shows published places with visible review aggregates only", async () => {
    const result = await browsePublishedPlaces({ q: "Needle" });
    expect(result.items).toHaveLength(1);
    expect(result.items[0]).toMatchObject({
      id: publishedPlaceId,
      ratingAverage: 5,
      reviewCount: 1,
      visitCount: 0,
    });
    expect(result.items.some(({ id }) => id === draftPlaceId)).toBe(false);
  });

  test("reveals only the current user's personal visit count", async () => {
    const ownerResult = await browsePublishedPlaces({ q: "Needle" }, owner.id);
    const otherResult = await browsePublishedPlaces({ q: "Needle" }, other.id);
    const adminResult = await browsePublishedPlaces({ q: "Needle" }, admin.id);
    expect(ownerResult.items[0]?.visitCount).toBe(1);
    expect(otherResult.items[0]?.visitCount).toBe(1);
    expect(adminResult.items[0]?.visitCount).toBe(0);
  });

  test("applies allowlisted public filters and safe fallbacks", async () => {
    const result = await browsePublishedPlaces({
      category: categorySlug,
      city: citySlug,
      page: "not-a-page",
      q: "quiet discovery",
      rating: "5",
      sort: "not-a-sort",
      type: "modern",
    });
    expect(result.input).toMatchObject({ page: 1, sort: "recent" });
    expect(result.items.map(({ id }) => id)).toEqual([publishedPlaceId]);
    expect(
      (await browsePublishedPlaces({ rating: 6, q: "Needle" })).items,
    ).toHaveLength(1);
  });

  test("publishes city and category indexes without counting drafts", async () => {
    expect(await getPublicCity(citySlug)).toMatchObject({
      placeCount: 1,
      slug: citySlug,
    });
    const restaurant = (await listPublicCategories()).find(
      ({ slug }) => slug === categorySlug,
    );
    expect(restaurant?.placeCount).toBeGreaterThanOrEqual(1);
  });
});

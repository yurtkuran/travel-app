import { afterAll, beforeAll, describe, expect, test } from "vitest";
import { ZodError } from "zod";
import { getSqlClient } from "@/db/client";
import { AuthorizationError, type Actor } from "@/features/auth/permissions";
import {
  createCanonicalPlace,
  getManagedPlace,
  listManagedPlaces,
  setPlacePublication,
  updateCanonicalPlace,
} from "@/features/places/server/management";
import { getPublishedPlace } from "@/features/places/server/moderation";
import { saveReview } from "@/features/reviews/server/reviews";
import { createVisit } from "@/features/visits/server/visits";
import {
  createTestCity,
  createTestUser,
  seededTaxonomy,
} from "../factories/database";

const sql = getSqlClient();
let admin: Actor;
let user: Actor;
let cityId: string;
const placeIds: string[] = [];
const values = (name: string) => ({
  addressLine2: "",
  categoryId: seededTaxonomy.categories.restaurant,
  cityId,
  description: "Canonical description.",
  latitude: "",
  longitude: "",
  mapListing: "",
  name,
  officialWebsite: "",
  phone: "",
  postalCode: "",
  shortSummary: "Canonical summary.",
  streetAddress: "",
  typeLabel: "Restaurant",
});

describe("canonical place administration", () => {
  beforeAll(async () => {
    const adminUser = await createTestUser(sql, "Place Admin");
    const normalUser = await createTestUser(sql, "Place User");
    const city = await createTestCity(sql);
    admin = { id: adminUser.id, role: "admin" };
    user = { id: normalUser.id, role: "user" };
    cityId = city.id;
  });
  afterAll(async () => {
    if (placeIds.length) {
      await sql`delete from audit_events where target_type = 'place' and target_id in ${sql(placeIds)}`;
      await sql`delete from visits where place_id in ${sql(placeIds)}`;
      await sql`delete from reviews where place_id in ${sql(placeIds)}`;
      await sql`delete from places where id in ${sql(placeIds)}`;
    }
    if (cityId) await sql`delete from cities where id=${cityId}`;
    if (admin?.id && user?.id)
      await sql`delete from "user" where id in ${sql([admin.id, user.id])}`;
    await sql.end();
  });

  test("requires place-management capabilities", async () => {
    await expect(
      createCanonicalPlace(user, values("Forbidden Place")),
    ).rejects.toBeInstanceOf(AuthorizationError);
    await expect(listManagedPlaces(user)).rejects.toBeInstanceOf(
      AuthorizationError,
    );
  });
  test("creates and lists a directly published canonical place", async () => {
    const place = await createCanonicalPlace(
      admin,
      values("Direct Admin Place"),
    );
    placeIds.push(place.id);
    expect(await getPublishedPlace(place.id)).toMatchObject({
      name: "Direct Admin Place",
      slug: "direct-admin-place",
    });
    expect(
      (await listManagedPlaces(admin, { q: "Direct Admin" })).items.map(
        ({ id }) => id,
      ),
    ).toContain(place.id);
  });
  test("paginates, filters, sorts, and safely normalizes repository input", async () => {
    const alpha = await createCanonicalPlace(admin, values("Alpha Repository"));
    const omega = await createCanonicalPlace(admin, values("Omega Repository"));
    placeIds.push(alpha.id, omega.id);
    await setPlacePublication(admin, omega.id, false);

    const firstPage = await listManagedPlaces(admin, {
      page: 1,
      pageSize: 1,
      q: "Repository",
      sort: "name",
      status: "all",
    });
    expect(firstPage).toMatchObject({ page: 1, pageSize: 1, total: 2 });
    expect(firstPage.items.map(({ id }) => id)).toEqual([alpha.id]);
    expect(
      (
        await listManagedPlaces(admin, {
          page: 2,
          pageSize: 1,
          q: "Repository",
          sort: "name",
          status: "all",
        })
      ).items.map(({ id }) => id),
    ).toEqual([omega.id]);
    expect(
      (
        await listManagedPlaces(admin, {
          q: "Repository",
          status: "unpublished",
        })
      ).items.map(({ id }) => id),
    ).toEqual([omega.id]);

    const fallback = await listManagedPlaces(admin, {
      page: "invalid",
      sort: "invalid" as "name",
      status: "invalid" as "all",
    });
    expect(fallback.input).toMatchObject({
      page: 1,
      sort: "recent",
      status: "all",
    });
  });
  test("edits canonical fields and maintains a descriptive slug", async () => {
    const place = await createCanonicalPlace(admin, values("Before Edit"));
    placeIds.push(place.id);
    await updateCanonicalPlace(admin, place.id, {
      ...values("After Edit"),
      latitude: "40.712800",
      longitude: "-74.006000",
      mapListing: "https://maps.example.com/after-edit",
      officialWebsite: "https://example.com/after-edit",
      shortSummary: "Updated summary.",
    });
    expect(await getManagedPlace(admin, place.id)).toMatchObject({
      latitude: "40.712800",
      longitude: "-74.006000",
      mapListing: "https://maps.example.com/after-edit",
      name: "After Edit",
      officialWebsite: "https://example.com/after-edit",
      shortSummary: "Updated summary.",
      slug: "after-edit",
    });
    expect(await getPublishedPlace(place.id)).toMatchObject({
      latitude: "40.712800",
      longitude: "-74.006000",
      mapListing: "https://maps.example.com/after-edit",
      officialWebsite: "https://example.com/after-edit",
    });
  });
  test("validates public links and coordinate pairs", async () => {
    await expect(
      createCanonicalPlace(admin, {
        ...values("Unsafe Website"),
        officialWebsite: "http://localhost/private",
      }),
    ).rejects.toBeInstanceOf(ZodError);
    await expect(
      createCanonicalPlace(admin, {
        ...values("Incomplete Coordinates"),
        latitude: "40.7128",
      }),
    ).rejects.toBeInstanceOf(ZodError);
  });
  test("unpublishes immediately while preserving reviews and visits, then republishes", async () => {
    const place = await createCanonicalPlace(admin, values("Lifecycle Place"));
    placeIds.push(place.id);
    await createVisit(user, place.id, {
      notes: "Preserved",
      overallRating: 4,
      ratings: {},
      visitedOn: "2026-10-01",
    });
    await saveReview(user, place.id, {
      overallRating: 5,
      ratings: {},
      text: "Preserved review",
    });
    await setPlacePublication(admin, place.id, false);
    expect(await getPublishedPlace(place.id)).toBeNull();
    const [counts] = await sql<
      { reviews: number; visits: number }[]
    >`select (select count(*)::integer from reviews where place_id=${place.id}) as reviews, (select count(*)::integer from visits where place_id=${place.id}) as visits`;
    expect(counts).toEqual({ reviews: 1, visits: 1 });
    await setPlacePublication(admin, place.id, true);
    expect(await getPublishedPlace(place.id)).toMatchObject({ id: place.id });
  });
});

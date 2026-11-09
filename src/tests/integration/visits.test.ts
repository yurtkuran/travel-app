import { randomUUID } from "node:crypto";

import { afterAll, beforeAll, describe, expect, test } from "vitest";

import { getSqlClient } from "@/db/client";
import type { Actor } from "@/features/auth/permissions";
import {
  createVisit,
  deleteVisit,
  listOwnVisits,
  updateVisit,
  VisitError,
} from "@/features/visits/server/visits";

import {
  createTestCity,
  createTestPlace,
  createTestUser,
  seededTaxonomy,
} from "../factories/database";

const sql = getSqlClient();
let cityId: string;
let owner: Actor;
let other: Actor;
let placeId: string;

describe("private visit lifecycle", () => {
  beforeAll(async () => {
    const ownerUser = await createTestUser(sql, "Visit Owner");
    const otherUser = await createTestUser(sql, "Visit Admin");
    const city = await createTestCity(sql);
    const place = await createTestPlace(sql, {
      categoryId: seededTaxonomy.categories.restaurant,
      cityId: city.id,
      createdByUserId: ownerUser.id,
    });
    owner = { id: ownerUser.id, role: "user" };
    other = { id: otherUser.id, role: "admin" };
    cityId = city.id;
    placeId = place.id;
  });

  afterAll(async () => {
    if (placeId) await sql`delete from visits where place_id = ${placeId}`;
    if (placeId) await sql`delete from places where id = ${placeId}`;
    if (cityId) await sql`delete from cities where id = ${cityId}`;
    if (owner?.id && other?.id)
      await sql`delete from "user" where id in ${sql([owner.id, other.id])}`;
    await sql.end();
  });

  test("creates a private visit with enabled rating dimensions", async () => {
    const visit = await createVisit(owner, placeId, {
      notes: "A private snapshot.",
      overallRating: 4,
      ratings: {
        [seededTaxonomy.dimensions.food]: 5,
        [seededTaxonomy.dimensions.service]: 3,
      },
      visitedOn: "2026-10-15",
    });
    const visits = await listOwnVisits(owner, placeId);
    expect(visits.find(({ id }) => id === visit.id)).toMatchObject({
      notes: "A private snapshot.",
      overallRating: 4,
      visitedOn: "2026-10-15",
    });
    expect(visits.find(({ id }) => id === visit.id)?.dimensions).toHaveLength(
      2,
    );
  });

  test("does not grant an administrator access to another user's visits", async () => {
    expect(await listOwnVisits(other, placeId)).toEqual([]);
    const [visit] = await listOwnVisits(owner, placeId);
    await expect(
      deleteVisit(other, visit?.id ?? randomUUID()),
    ).rejects.toBeInstanceOf(VisitError);
  });

  test("rejects unsupported category rating dimensions", async () => {
    await expect(
      createVisit(owner, placeId, {
        notes: "",
        overallRating: 4,
        ratings: { [randomUUID()]: 4 },
        visitedOn: "2026-10-16",
      }),
    ).rejects.toBeInstanceOf(VisitError);
  });

  test("updates and deletes only the owner's visit", async () => {
    const visit = await createVisit(owner, placeId, {
      notes: "Before",
      overallRating: 2,
      ratings: {},
      visitedOn: "2026-09-01",
    });
    await updateVisit(owner, visit.id, {
      notes: "Corrected snapshot",
      overallRating: 5,
      ratings: { [seededTaxonomy.dimensions.atmosphere]: 4 },
      visitedOn: "2026-09-02",
    });
    expect(
      (await listOwnVisits(owner, placeId)).find(({ id }) => id === visit.id),
    ).toMatchObject({
      notes: "Corrected snapshot",
      overallRating: 5,
      visitedOn: "2026-09-02",
    });
    await deleteVisit(owner, visit.id);
    expect(
      (await listOwnVisits(owner, placeId)).some(({ id }) => id === visit.id),
    ).toBe(false);
  });
});

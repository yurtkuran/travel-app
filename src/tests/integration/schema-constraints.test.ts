import { randomUUID } from "node:crypto";

import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { getSqlClient } from "@/db/client";
import {
  createTestCity,
  createTestPlace,
  createTestUser,
  seededTaxonomy,
} from "@/tests/factories/database";

const sql = getSqlClient();

describe("database schema constraints", () => {
  let userId: string;
  let secondUserId: string;
  let cityId: string;
  let restaurantPlaceId: string;
  let attractionPlaceId: string;
  let restaurantReviewId: string;

  beforeAll(async () => {
    const user = await createTestUser(sql);
    const secondUser = await createTestUser(sql, "Second Test Traveler");
    const city = await createTestCity(sql);

    userId = user.id;
    secondUserId = secondUser.id;
    cityId = city.id;
    restaurantPlaceId = (
      await createTestPlace(sql, { cityId, createdByUserId: userId })
    ).id;
    attractionPlaceId = (
      await createTestPlace(sql, {
        cityId,
        categoryId: seededTaxonomy.categories.attraction,
        createdByUserId: userId,
      })
    ).id;
  });

  afterAll(async () => {
    if (userId && secondUserId) {
      await sql`delete from "user" where id in (${userId}, ${secondUserId})`;
    }
    if (restaurantPlaceId && attractionPlaceId) {
      await sql`delete from places where id in (${restaurantPlaceId}, ${attractionPlaceId})`;
    }
    if (cityId) await sql`delete from cities where id = ${cityId}`;
    await sql.end();
  });

  it("allows incomplete drafts but rejects incomplete publication", async () => {
    const [draft] = await sql<{ id: string }[]>`
      insert into places (status) values ('draft') returning id
    `;
    expect(draft?.id).toBeDefined();

    await expect(
      sql`insert into places (status) values ('published')`,
    ).rejects.toMatchObject({
      code: "23514",
    });

    if (draft) await sql`delete from places where id = ${draft.id}`;
  });

  it("requires coordinates to be a valid pair", async () => {
    await expect(sql`
      insert into places (name, slug, city_id, category_id, status, latitude)
      values (
        'Invalid Coordinate Place',
        ${`invalid-coordinates-${randomUUID()}`},
        ${cityId},
        ${seededTaxonomy.categories.restaurant},
        'published',
        40.7128
      )
    `).rejects.toMatchObject({ code: "23514" });
  });

  it("enforces rating range and one review per user and place", async () => {
    await expect(sql`
      insert into reviews (user_id, place_id, overall_rating)
      values (${userId}, ${restaurantPlaceId}, 6)
    `).rejects.toMatchObject({ code: "23514" });

    const [review] = await sql<{ id: string }[]>`
      insert into reviews (user_id, place_id, overall_rating)
      values (${userId}, ${restaurantPlaceId}, 5)
      returning id
    `;
    if (!review) throw new Error("Test review was not created");
    restaurantReviewId = review.id;

    await expect(sql`
      insert into reviews (user_id, place_id, overall_rating)
      values (${userId}, ${restaurantPlaceId}, 4)
    `).rejects.toMatchObject({ code: "23505" });
  });

  it("accepts enabled review dimensions and rejects unsupported ones", async () => {
    await sql`
      insert into review_ratings (review_id, rating_dimension_id, rating)
      values (${restaurantReviewId}, ${seededTaxonomy.dimensions.food}, 5)
    `;

    const [attractionReview] = await sql<{ id: string }[]>`
      insert into reviews (user_id, place_id, overall_rating)
      values (${userId}, ${attractionPlaceId}, 4)
      returning id
    `;
    if (!attractionReview) throw new Error("Attraction review was not created");

    await expect(sql`
      insert into review_ratings (review_id, rating_dimension_id, rating)
      values (${attractionReview.id}, ${seededTaxonomy.dimensions.food}, 4)
    `).rejects.toMatchObject({ code: "23514" });
  });

  it("enforces visit rating ranges and category capabilities", async () => {
    await expect(sql`
      insert into visits (user_id, place_id, visited_on, overall_rating)
      values (${secondUserId}, ${restaurantPlaceId}, current_date, 0)
    `).rejects.toMatchObject({ code: "23514" });

    const [visit] = await sql<{ id: string }[]>`
      insert into visits (user_id, place_id, visited_on, overall_rating)
      values (${secondUserId}, ${attractionPlaceId}, current_date, 4)
      returning id
    `;
    if (!visit) throw new Error("Test visit was not created");

    await expect(sql`
      insert into visit_ratings (visit_id, rating_dimension_id, rating)
      values (${visit.id}, ${seededTaxonomy.dimensions.service}, 4)
    `).rejects.toMatchObject({ code: "23514" });
  });

  it("derives public aggregates only from eligible reviews", async () => {
    const [visible] = await sql<{ average: string; count: string }[]>`
      select avg(overall_rating)::text as average, count(*)::text as count
        from reviews
       where place_id = ${restaurantPlaceId}
         and moderation_status = 'visible'
         and author_deleted_at is null
    `;
    expect(visible).toEqual({ average: "5.0000000000000000", count: "1" });

    await sql`
      update reviews
         set moderation_status = 'hidden', moderated_at = now()
       where id = ${restaurantReviewId}
    `;

    const [hidden] = await sql<{ average: string | null; count: string }[]>`
      select avg(overall_rating)::text as average, count(*)::text as count
        from reviews
       where place_id = ${restaurantPlaceId}
         and moderation_status = 'visible'
         and author_deleted_at is null
    `;
    expect(hidden).toEqual({ average: null, count: "0" });
  });

  it("allows only one active setup token per account", async () => {
    await sql`
      insert into account_setup_tokens (user_id, token_hash, expires_at)
      values (${userId}, ${`token-${randomUUID()}`}, now() + interval '72 hours')
    `;

    await expect(sql`
      insert into account_setup_tokens (user_id, token_hash, expires_at)
      values (${userId}, ${`token-${randomUUID()}`}, now() + interval '72 hours')
    `).rejects.toMatchObject({ code: "23505" });

    await sql`
      update account_setup_tokens
         set revoked_at = now()
       where user_id = ${userId} and consumed_at is null and revoked_at is null
    `;

    await sql`
      insert into account_setup_tokens (user_id, token_hash, expires_at)
      values (${userId}, ${`token-${randomUUID()}`}, now() + interval '72 hours')
    `;
  });

  it("rejects reviews and proposals for unpublished places", async () => {
    const [draft] = await sql<{ id: string }[]>`
      insert into places (status) values ('draft') returning id
    `;
    if (!draft) throw new Error("Draft place was not created");

    await expect(sql`
      insert into reviews (user_id, place_id, overall_rating)
      values (${secondUserId}, ${draft.id}, 4)
    `).rejects.toMatchObject({ code: "23514" });

    await expect(sql`
      insert into place_change_proposals (place_id, proposed_by_user_id, proposed_values)
      values (${draft.id}, ${secondUserId}, ${sql.json({ name: "Proposed name" })})
    `).rejects.toMatchObject({ code: "23514" });

    await sql`delete from places where id = ${draft.id}`;
  });

  it("applies account-deletion retention actions without exposing private activity", async () => {
    const disposableUser = await createTestUser(
      sql,
      "Disposable Test Traveler",
    );

    const [review] = await sql<{ id: string }[]>`
      insert into reviews (user_id, place_id, overall_rating)
      values (${disposableUser.id}, ${restaurantPlaceId}, 4)
      returning id
    `;
    const [visit] = await sql<{ id: string }[]>`
      insert into visits (user_id, place_id, visited_on, overall_rating, notes)
      values (${disposableUser.id}, ${restaurantPlaceId}, current_date, 4, 'Private note')
      returning id
    `;
    const [audit] = await sql<{ id: string }[]>`
      insert into audit_events (actor_type, actor_user_id, action, target_type)
      values ('user', ${disposableUser.id}, 'test.action', 'test_target')
      returning id
    `;
    if (!review || !visit || !audit)
      throw new Error("Retention fixtures were not created");

    await sql`delete from "user" where id = ${disposableUser.id}`;

    const [counts] = await sql<
      { reviews: string; visits: string; actor_user_id: string | null }[]
    >`
      select
        (select count(*)::text from reviews where id = ${review.id}) as reviews,
        (select count(*)::text from visits where id = ${visit.id}) as visits,
        (select actor_user_id from audit_events where id = ${audit.id}) as actor_user_id
    `;
    expect(counts).toEqual({ reviews: "0", visits: "0", actor_user_id: null });

    await sql`delete from audit_events where id = ${audit.id}`;
  });
});

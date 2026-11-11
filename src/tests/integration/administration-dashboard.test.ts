import { afterAll, beforeAll, describe, expect, test } from "vitest";

import { getSqlClient } from "@/db/client";
import { getAdministrationDashboard } from "@/features/admin/server/dashboard";

import {
  createTestCity,
  createTestPlace,
  createTestUser,
} from "../factories/database";

const sql = getSqlClient();
let adminId: string;
let cityId: string;
let pendingPlaceId: string;
let proposalId: string;
let publishedPlaceId: string;
let reviewId: string;
let submitterId: string;

const actor = () => ({ id: adminId, role: "admin" as const });

describe("administration dashboard", () => {
  beforeAll(async () => {
    const [admin, submitter, city] = await Promise.all([
      createTestUser(sql, "Dashboard Administrator"),
      createTestUser(sql, "Dashboard Contributor"),
      createTestCity(sql),
    ]);
    adminId = admin.id;
    submitterId = submitter.id;
    cityId = city.id;
    await sql`update "user" set role='admin' where id=${adminId}`;

    const [pending, published] = await Promise.all([
      createTestPlace(sql, {
        cityId,
        createdByUserId: submitterId,
        status: "draft",
      }),
      createTestPlace(sql, {
        cityId,
        createdByUserId: adminId,
        status: "published",
      }),
    ]);
    pendingPlaceId = pending.id;
    publishedPlaceId = published.id;
    await sql`
      update places
         set status='pending_review', submitted_by_user_id=${submitterId},
             submitted_at=now() - interval '10 years'
       where id=${pendingPlaceId}
    `;
    const [proposal] = await sql<{ id: string }[]>`
      insert into place_change_proposals (
        place_id, proposed_by_user_id, status, proposed_values, submitted_at, created_at
      ) values (
        ${publishedPlaceId}, ${submitterId}, 'pending_review', '{}'::jsonb,
        now() - interval '10 years', now() - interval '10 years'
      ) returning id
    `;
    if (!proposal) throw new Error("Dashboard proposal was not created");
    proposalId = proposal.id;
    const [review] = await sql<{ id: string }[]>`
      insert into reviews (
        user_id, place_id, overall_rating, text, moderation_status, updated_at
      ) values (
        ${submitterId}, ${publishedPlaceId}, 4, 'Dashboard hidden review',
        'hidden', now() - interval '10 years'
      ) returning id
    `;
    if (!review) throw new Error("Dashboard review was not created");
    reviewId = review.id;
    await sql`
      insert into audit_events (
        actor_type, actor_user_id, action, target_type, target_id, created_at
      ) values (
        'user', ${adminId}, 'dashboard.test_event', 'place',
        ${publishedPlaceId}, now() + interval '1 hour'
      )
    `;
  });

  afterAll(async () => {
    const targetIds = [
      pendingPlaceId,
      publishedPlaceId,
      proposalId,
      reviewId,
    ].filter(Boolean);
    if (adminId && targetIds.length) {
      await sql`delete from audit_events where actor_user_id=${adminId} or target_id in ${sql(targetIds)}`;
    }
    if (reviewId) await sql`delete from reviews where id=${reviewId}`;
    if (proposalId) {
      await sql`delete from place_change_proposals where id=${proposalId}`;
    }
    const placeIds = [pendingPlaceId, publishedPlaceId].filter(Boolean);
    if (placeIds.length)
      await sql`delete from places where id in ${sql(placeIds)}`;
    if (cityId) await sql`delete from cities where id=${cityId}`;
    const userIds = [adminId, submitterId].filter(Boolean);
    if (userIds.length)
      await sql`delete from "user" where id in ${sql(userIds)}`;
    await sql.end();
  });

  test("returns actionable moderation counts without private activity", async () => {
    const dashboard = await getAdministrationDashboard(actor());
    expect(dashboard.counts.pendingSubmissions).toBeGreaterThanOrEqual(1);
    expect(dashboard.counts.pendingProposals).toBeGreaterThanOrEqual(1);
    expect(dashboard.counts.hiddenReviews).toBeGreaterThanOrEqual(1);
    expect(dashboard.queue).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ id: pendingPlaceId, type: "submission" }),
        expect.objectContaining({ id: proposalId, type: "proposal" }),
        expect.objectContaining({ id: reviewId, type: "review" }),
      ]),
    );
    expect(dashboard).not.toHaveProperty("visits");
    expect(dashboard.queue.every((item) => !("notes" in item))).toBe(true);
  });

  test("returns only redacted recent administrative activity", async () => {
    const dashboard = await getAdministrationDashboard(actor());
    expect(dashboard.activity[0]).toMatchObject({
      action: "dashboard.test_event",
      actorName: "Dashboard Administrator",
      targetType: "place",
    });
    expect(dashboard.activity[0]).not.toHaveProperty("metadata");
    expect(dashboard.activity[0]).not.toHaveProperty("targetId");
  });
});

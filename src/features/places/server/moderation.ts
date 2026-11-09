import "server-only";

import { z } from "zod";

import { getSqlClient } from "@/db/client";
import { requireCapability, type Actor } from "@/features/auth/permissions";

const moderationListSchema = z.object({
  page: z.coerce.number().int().positive().default(1).catch(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20).catch(20),
  sort: z.enum(["oldest", "recent", "name"]).default("oldest").catch("oldest"),
});

const rejectionSchema = z
  .string()
  .trim()
  .min(1, "A rejection reason is required")
  .max(2000, "The rejection reason must be 2,000 characters or fewer");

export class PlaceModerationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "PlaceModerationError";
  }
}

function slugify(value: string) {
  return (
    value
      .normalize("NFKD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 180)
      .replace(/-+$/g, "") || "place"
  );
}

async function lockPendingSubmission(
  transaction: import("postgres").TransactionSql<Record<string, never>>,
  placeId: string,
) {
  const [place] = await transaction<
    {
      category_id: string | null;
      city_id: string | null;
      name: string | null;
      status: string;
    }[]
  >`
    select name, city_id, category_id, status
      from places
     where id = ${placeId}
     for update
  `;
  if (!place) throw new PlaceModerationError("Submission not found");
  if (place.status !== "pending_review") {
    throw new PlaceModerationError(
      "This submission is no longer waiting for review",
    );
  }
  return place;
}

export interface ModerationListItem {
  categoryName: string;
  cityName: string;
  id: string;
  name: string;
  sourceName: string | null;
  submittedAt: string;
  submitterName: string | null;
}

export async function listPendingSubmissions(
  actor: Actor,
  rawInput: z.input<typeof moderationListSchema> = {},
) {
  requireCapability(actor, "submissions.moderate");
  const input = moderationListSchema.parse(rawInput);
  const offset = (input.page - 1) * input.pageSize;
  const sql = getSqlClient();
  const order =
    input.sort === "recent"
      ? sql`p.submitted_at desc, p.id desc`
      : input.sort === "name"
        ? sql`p.name, p.submitted_at, p.id`
        : sql`p.submitted_at, p.id`;
  const [items, totals] = await Promise.all([
    sql<ModerationListItem[]>`
      select p.id,
             p.name,
             p.submitted_at::text as "submittedAt",
             city.name as "cityName",
             category.name as "categoryName",
             provenance.source_name as "sourceName",
             submitter.name as "submitterName"
        from places p
        join cities city on city.id = p.city_id
        join categories category on category.id = p.category_id
        left join place_submission_provenance provenance on provenance.place_id = p.id
        left join "user" submitter on submitter.id = p.submitted_by_user_id
       where p.status = 'pending_review'
       order by ${order}
       limit ${input.pageSize}
      offset ${offset}
    `,
    sql<{ count: number }[]>`
      select count(*)::integer as count
        from places
       where status = 'pending_review'
    `,
  ]);
  return {
    items,
    page: input.page,
    pageSize: input.pageSize,
    total: totals[0]?.count ?? 0,
  };
}

export interface ModerationDetail extends ModerationListItem {
  addressLine2: string | null;
  description: string | null;
  phone: string | null;
  postalCode: string | null;
  recommendedOn: string | null;
  shortSummary: string | null;
  sourceType: string | null;
  sourceUrl: string | null;
  streetAddress: string | null;
  submissionNotes: string | null;
  typeLabel: string | null;
}

export async function getSubmissionForModeration(
  actor: Actor,
  placeId: string,
) {
  requireCapability(actor, "submissions.moderate");
  const [submission] = await getSqlClient()<ModerationDetail[]>`
    select p.id,
           p.name,
           p.submitted_at::text as "submittedAt",
           p.short_summary as "shortSummary",
           p.description,
           p.type_label as "typeLabel",
           p.street_address as "streetAddress",
           p.address_line_2 as "addressLine2",
           p.postal_code as "postalCode",
           p.phone,
           city.name as "cityName",
           category.name as "categoryName",
           provenance.source_type as "sourceType",
           provenance.source_name as "sourceName",
           provenance.source_url as "sourceUrl",
           provenance.recommended_on::text as "recommendedOn",
           provenance.submission_notes as "submissionNotes",
           submitter.name as "submitterName"
      from places p
      join cities city on city.id = p.city_id
      join categories category on category.id = p.category_id
      left join place_submission_provenance provenance on provenance.place_id = p.id
      left join "user" submitter on submitter.id = p.submitted_by_user_id
     where p.id = ${placeId}
       and p.status = 'pending_review'
  `;
  return submission ?? null;
}

export async function publishSubmission(actor: Actor, placeId: string) {
  requireCapability(actor, "submissions.moderate");
  requireCapability(actor, "places.publish");
  const sql = getSqlClient();

  return sql.begin(async (transaction) => {
    const place = await lockPendingSubmission(transaction, placeId);
    if (!place.name || !place.city_id || !place.category_id) {
      throw new PlaceModerationError(
        "The submission is missing information required for publication",
      );
    }
    const [taxonomy] = await transaction<
      { category_active: boolean; city_active: boolean }[]
    >`
      select city.is_active as city_active,
             category.is_active as category_active
        from cities city, categories category
       where city.id = ${place.city_id}
         and category.id = ${place.category_id}
    `;
    if (!taxonomy?.city_active || !taxonomy.category_active) {
      throw new PlaceModerationError(
        "The city and category must be active before publication",
      );
    }

    const slug = slugify(place.name);
    await transaction`
      update places
         set status = 'published',
             slug = ${slug},
             published_by_user_id = ${actor.id},
             moderated_by_user_id = ${actor.id},
             updated_by_user_id = ${actor.id},
             moderation_reason = null,
             published_at = now(),
             moderated_at = now(),
             updated_at = now()
       where id = ${placeId}
    `;
    await transaction`
      insert into audit_events (actor_type, actor_user_id, action, target_type, target_id)
      values ('user', ${actor.id}, 'place.published', 'place', ${placeId})
    `;
    return { id: placeId, slug };
  });
}

export async function rejectSubmission(
  actor: Actor,
  placeId: string,
  rawReason: string,
) {
  requireCapability(actor, "submissions.moderate");
  const reason = rejectionSchema.parse(rawReason);
  const sql = getSqlClient();

  await sql.begin(async (transaction) => {
    await lockPendingSubmission(transaction, placeId);
    await transaction`
      update places
         set status = 'rejected',
             moderated_by_user_id = ${actor.id},
             updated_by_user_id = ${actor.id},
             moderation_reason = ${reason},
             moderated_at = now(),
             updated_at = now()
       where id = ${placeId}
    `;
    await transaction`
      insert into audit_events (actor_type, actor_user_id, action, target_type, target_id)
      values ('user', ${actor.id}, 'place.rejected', 'place', ${placeId})
    `;
  });
}

export interface PublicPlaceDetail {
  addressLine2: string | null;
  categoryName: string;
  cityLabel: string;
  description: string | null;
  id: string;
  name: string;
  phone: string | null;
  postalCode: string | null;
  shortSummary: string | null;
  slug: string;
  streetAddress: string | null;
  typeLabel: string | null;
}

export async function getPublishedPlace(placeId: string) {
  const [place] = await getSqlClient()<PublicPlaceDetail[]>`
    select p.id,
           p.name,
           p.slug,
           p.short_summary as "shortSummary",
           p.description,
           p.type_label as "typeLabel",
           p.street_address as "streetAddress",
           p.address_line_2 as "addressLine2",
           p.postal_code as "postalCode",
           p.phone,
           concat_ws(', ', city.name, city.region, city.country) as "cityLabel",
           category.name as "categoryName"
      from places p
      join cities city on city.id = p.city_id
      join categories category on category.id = p.category_id
     where p.id = ${placeId}
       and p.status = 'published'
  `;
  return place ?? null;
}

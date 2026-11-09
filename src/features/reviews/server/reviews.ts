import "server-only";

import type postgres from "postgres";
import { z } from "zod";

import { getSqlClient } from "@/db/client";
import { requireCapability, type Actor } from "@/features/auth/permissions";

type Transaction = postgres.TransactionSql<Record<string, never>>;
const rating = z.coerce.number().int().min(1).max(5);
const reviewSchema = z.object({
  overallRating: rating,
  ratings: z.record(z.string(), rating).default({}),
  text: z
    .string()
    .trim()
    .max(5000)
    .transform((value) => value || null),
});
export type ReviewInput = z.input<typeof reviewSchema>;

export class ReviewError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ReviewError";
  }
}

async function capabilities(
  database: ReturnType<typeof getSqlClient> | Transaction,
  placeId: string,
) {
  const query = database as Transaction;
  return query<{ id: string; name: string }[]>`
    select dimension.id, dimension.name
      from places place
      join category_rating_capabilities capability on capability.category_id = place.category_id and capability.enabled
      join rating_dimensions dimension on dimension.id = capability.rating_dimension_id and dimension.is_active
     where place.id = ${placeId} and place.status = 'published'
     order by dimension.display_order, dimension.name
  `;
}

function validateRatings(
  values: Record<string, number>,
  allowed: { id: string }[],
) {
  const ids = new Set(allowed.map(({ id }) => id));
  if (Object.keys(values).some((id) => !ids.has(id)))
    throw new ReviewError("One or more ratings are unavailable");
}

export interface ReviewPlace {
  dimensions: { id: string; name: string }[];
  id: string;
  name: string;
  slug: string;
}

export async function getReviewPlace(
  placeId: string,
): Promise<ReviewPlace | null> {
  const sql = getSqlClient();
  const [place] = await sql<Omit<ReviewPlace, "dimensions">[]>`
    select id, name, slug from places where id = ${placeId} and status = 'published'
  `;
  if (!place) return null;
  return { ...place, dimensions: await capabilities(sql, placeId) };
}

export interface ReviewItem {
  dimensions: { id: string; name: string; rating: number }[];
  id: string;
  moderationStatus: "visible" | "hidden" | "removed";
  overallRating: number;
  placeId: string;
  placeName: string;
  placeSlug: string;
  text: string | null;
  updatedAt: string;
  userName: string;
}

type ReviewRow = Omit<ReviewItem, "dimensions"> & {
  dimensionId: string | null;
  dimensionName: string | null;
  dimensionRating: number | null;
};

function group(rows: ReviewRow[]) {
  const result = new Map<string, ReviewItem>();
  for (const row of rows) {
    const item = result.get(row.id) ?? { ...row, dimensions: [] };
    if (row.dimensionId && row.dimensionName && row.dimensionRating)
      item.dimensions.push({
        id: row.dimensionId,
        name: row.dimensionName,
        rating: row.dimensionRating,
      });
    result.set(row.id, item);
  }
  return [...result.values()];
}

export async function getOwnReview(actor: Actor, placeId: string) {
  requireCapability(actor, "reviews.manageOwn");
  const sql = getSqlClient();
  const rows = await sql<
    (Omit<ReviewItem, "dimensions"> & {
      dimensionId: string | null;
      dimensionName: string | null;
      dimensionRating: number | null;
    })[]
  >`
    select review.id, review.place_id as "placeId", review.overall_rating as "overallRating", review.text,
      review.moderation_status as "moderationStatus", review.updated_at::text as "updatedAt",
      place.name as "placeName", place.slug as "placeSlug", author.name as "userName",
      dimension.id as "dimensionId", dimension.name as "dimensionName", value.rating as "dimensionRating"
    from reviews review join places place on place.id = review.place_id join "user" author on author.id = review.user_id
    left join review_ratings value on value.review_id = review.id left join rating_dimensions dimension on dimension.id = value.rating_dimension_id
    where review.user_id = ${actor.id} and review.place_id = ${placeId}
  `;
  return group(rows)[0] ?? null;
}

export async function listOwnReviews(actor: Actor) {
  requireCapability(actor, "reviews.manageOwn");
  const sql = getSqlClient();
  const rows = await sql<
    (Omit<ReviewItem, "dimensions"> & {
      dimensionId: string | null;
      dimensionName: string | null;
      dimensionRating: number | null;
    })[]
  >`
    select review.id, review.place_id as "placeId", review.overall_rating as "overallRating", review.text,
      review.moderation_status as "moderationStatus", review.updated_at::text as "updatedAt",
      place.name as "placeName", place.slug as "placeSlug", author.name as "userName",
      dimension.id as "dimensionId", dimension.name as "dimensionName", value.rating as "dimensionRating"
    from reviews review join places place on place.id = review.place_id join "user" author on author.id = review.user_id
    left join review_ratings value on value.review_id = review.id left join rating_dimensions dimension on dimension.id = value.rating_dimension_id
    where review.user_id = ${actor.id} order by review.updated_at desc, dimension.display_order
  `;
  return group(rows);
}

export async function saveReview(
  actor: Actor,
  placeId: string,
  raw: ReviewInput,
) {
  requireCapability(actor, "reviews.manageOwn");
  const input = reviewSchema.parse(raw);
  return getSqlClient().begin(async (transaction) => {
    const allowed = await capabilities(transaction, placeId);
    const [exists] = await transaction<
      { exists: boolean }[]
    >`select exists(select 1 from places where id = ${placeId} and status = 'published') as exists`;
    if (!exists?.exists) throw new ReviewError("Published place not found");
    validateRatings(input.ratings, allowed);
    const [review] = await transaction<{ id: string }[]>`
      insert into reviews (user_id, place_id, overall_rating, text) values (${actor.id}, ${placeId}, ${input.overallRating}, ${input.text})
      on conflict (user_id, place_id) do update set overall_rating = excluded.overall_rating, text = excluded.text, updated_at = now()
      returning id
    `;
    if (!review) throw new Error("Review save did not return a record");
    await transaction`delete from review_ratings where review_id = ${review.id}`;
    for (const [dimensionId, value] of Object.entries(input.ratings))
      await transaction`insert into review_ratings (review_id, rating_dimension_id, rating) values (${review.id}, ${dimensionId}, ${value})`;
    return review;
  });
}

export async function deleteOwnReview(actor: Actor, reviewId: string) {
  requireCapability(actor, "reviews.manageOwn");
  const result =
    await getSqlClient()`delete from reviews where id = ${reviewId} and user_id = ${actor.id}`;
  if (!result.count) throw new ReviewError("Review not found");
}

export async function listPublicReviews(placeId: string) {
  const sql = getSqlClient();
  const rows = await sql<
    (Omit<ReviewItem, "dimensions"> & {
      dimensionId: string | null;
      dimensionName: string | null;
      dimensionRating: number | null;
    })[]
  >`
    select review.id, review.place_id as "placeId", review.overall_rating as "overallRating", review.text,
      review.moderation_status as "moderationStatus", review.updated_at::text as "updatedAt",
      place.name as "placeName", place.slug as "placeSlug", author.name as "userName",
      dimension.id as "dimensionId", dimension.name as "dimensionName", value.rating as "dimensionRating"
    from reviews review join places place on place.id = review.place_id join "user" author on author.id = review.user_id
    left join review_ratings value on value.review_id = review.id left join rating_dimensions dimension on dimension.id = value.rating_dimension_id
    where review.place_id = ${placeId} and review.moderation_status = 'visible' and review.author_deleted_at is null
    order by review.updated_at desc, dimension.display_order
  `;
  return group(rows);
}

export async function getPublicRatingSummary(placeId: string) {
  const sql = getSqlClient();
  const [overall, dimensions] = await Promise.all([
    sql<
      { average: number | null; count: number }[]
    >`select round(avg(overall_rating), 2)::float as average, count(*)::integer as count from reviews where place_id = ${placeId} and moderation_status = 'visible' and author_deleted_at is null`,
    sql<
      { average: number; count: number; name: string }[]
    >`select dimension.name, round(avg(value.rating), 2)::float as average, count(*)::integer as count from review_ratings value join reviews review on review.id = value.review_id join rating_dimensions dimension on dimension.id = value.rating_dimension_id where review.place_id = ${placeId} and review.moderation_status = 'visible' and review.author_deleted_at is null group by dimension.id, dimension.name, dimension.display_order order by dimension.display_order`,
  ]);
  return { overall: overall[0] ?? { average: null, count: 0 }, dimensions };
}

export async function listReviewsForModeration(actor: Actor) {
  requireCapability(actor, "reviews.moderate");
  const sql = getSqlClient();
  const rows = await sql<
    (Omit<ReviewItem, "dimensions"> & {
      dimensionId: string | null;
      dimensionName: string | null;
      dimensionRating: number | null;
    })[]
  >`
    select review.id, review.place_id as "placeId", review.overall_rating as "overallRating", review.text, review.moderation_status as "moderationStatus", review.updated_at::text as "updatedAt", place.name as "placeName", place.slug as "placeSlug", author.name as "userName", null::uuid as "dimensionId", null::text as "dimensionName", null::integer as "dimensionRating" from reviews review join places place on place.id = review.place_id join "user" author on author.id = review.user_id order by review.updated_at desc
  `;
  return group(rows);
}

export async function moderateReview(
  actor: Actor,
  reviewId: string,
  status: "visible" | "hidden" | "removed",
) {
  requireCapability(actor, "reviews.moderate");
  await getSqlClient().begin(async (transaction) => {
    const result =
      await transaction`update reviews set moderation_status = ${status}, moderated_by_user_id = ${actor.id}, moderated_at = now(), updated_at = now() where id = ${reviewId}`;
    if (!result.count) throw new ReviewError("Review not found");
    await transaction`insert into audit_events (actor_type, actor_user_id, action, target_type, target_id) values ('user', ${actor.id}, ${`review.${status}`}, 'review', ${reviewId})`;
  });
}

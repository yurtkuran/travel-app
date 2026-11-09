import "server-only";

import type postgres from "postgres";
import { z } from "zod";

import { getSqlClient } from "@/db/client";
import { requireCapability, type Actor } from "@/features/auth/permissions";

type Transaction = postgres.TransactionSql<Record<string, never>>;

const ratingSchema = z.coerce.number().int().min(1).max(5);
const visitSchema = z.object({
  notes: z
    .string()
    .trim()
    .max(5000)
    .transform((value) => value || null),
  overallRating: ratingSchema,
  ratings: z.record(z.string(), ratingSchema).default({}),
  visitedOn: z.iso.date(),
});

export type VisitInput = z.input<typeof visitSchema>;

export class VisitError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "VisitError";
  }
}

export interface VisitDimension {
  id: string;
  name: string;
  rating: number | null;
}

export interface VisitPlace {
  categoryName: string;
  cityLabel: string;
  dimensions: VisitDimension[];
  id: string;
  name: string;
  slug: string;
}

async function getCapabilities(
  database: ReturnType<typeof getSqlClient> | Transaction,
  placeId: string,
) {
  const query = database as Transaction;
  return query<{ id: string; name: string }[]>`
    select dimension.id, dimension.name
      from places place
      join category_rating_capabilities capability
        on capability.category_id = place.category_id
       and capability.enabled
      join rating_dimensions dimension
        on dimension.id = capability.rating_dimension_id
       and dimension.is_active
     where place.id = ${placeId}
       and place.status = 'published'
     order by dimension.display_order, dimension.name
  `;
}

function validateRatings(
  ratings: Record<string, number>,
  dimensions: { id: string }[],
) {
  const allowed = new Set(dimensions.map(({ id }) => id));
  if (Object.keys(ratings).some((id) => !allowed.has(id))) {
    throw new VisitError(
      "One or more ratings are not available for this place",
    );
  }
}

export async function getVisitPlace(
  placeId: string,
): Promise<VisitPlace | null> {
  const sql = getSqlClient();
  const [place] = await sql<Omit<VisitPlace, "dimensions">[]>`
    select place.id,
           place.name,
           place.slug,
           category.name as "categoryName",
           concat_ws(', ', city.name, city.region, city.country) as "cityLabel"
      from places place
      join cities city on city.id = place.city_id
      join categories category on category.id = place.category_id
     where place.id = ${placeId}
       and place.status = 'published'
  `;
  if (!place) return null;
  const dimensions = await getCapabilities(sql, placeId);
  return {
    ...place,
    dimensions: dimensions.map((dimension) => ({ ...dimension, rating: null })),
  };
}

export interface VisitListItem {
  dimensions: VisitDimension[];
  id: string;
  notes: string | null;
  overallRating: number;
  placeId: string;
  placeName: string;
  placeSlug: string;
  visitedOn: string;
}

export async function listOwnVisits(actor: Actor, placeId?: string) {
  requireCapability(actor, "visits.manageOwn");
  const sql = getSqlClient();
  const rows = await sql<
    (Omit<VisitListItem, "dimensions"> & {
      dimensionId: string | null;
      dimensionName: string | null;
      dimensionRating: number | null;
    })[]
  >`
    select visit.id,
           visit.place_id as "placeId",
           visit.visited_on::text as "visitedOn",
           visit.overall_rating as "overallRating",
           visit.notes,
           place.name as "placeName",
           place.slug as "placeSlug",
           dimension.id as "dimensionId",
           dimension.name as "dimensionName",
           rating.rating as "dimensionRating"
      from visits visit
      join places place on place.id = visit.place_id
      left join visit_ratings rating on rating.visit_id = visit.id
      left join rating_dimensions dimension on dimension.id = rating.rating_dimension_id
     where visit.user_id = ${actor.id}
       and (${placeId ?? null}::uuid is null or visit.place_id = ${placeId ?? null}::uuid)
     order by visit.visited_on desc, visit.created_at desc, dimension.display_order
  `;
  const visits = new Map<string, VisitListItem>();
  for (const row of rows) {
    const visit = visits.get(row.id) ?? { ...row, dimensions: [] };
    if (row.dimensionId && row.dimensionName && row.dimensionRating) {
      visit.dimensions.push({
        id: row.dimensionId,
        name: row.dimensionName,
        rating: row.dimensionRating,
      });
    }
    visits.set(row.id, visit);
  }
  return [...visits.values()];
}

export async function createVisit(
  actor: Actor,
  placeId: string,
  raw: VisitInput,
) {
  requireCapability(actor, "visits.manageOwn");
  const input = visitSchema.parse(raw);
  if (input.visitedOn > new Date().toISOString().slice(0, 10)) {
    throw new VisitError("Visit date cannot be in the future");
  }
  return getSqlClient().begin(async (transaction) => {
    const dimensions = await getCapabilities(transaction, placeId);
    const [exists] = await transaction<{ exists: boolean }[]>`
      select exists(select 1 from places where id = ${placeId} and status = 'published') as exists
    `;
    if (!exists?.exists) throw new VisitError("Published place not found");
    validateRatings(input.ratings, dimensions);
    const [visit] = await transaction<{ id: string }[]>`
      insert into visits (user_id, place_id, visited_on, overall_rating, notes)
      values (${actor.id}, ${placeId}, ${input.visitedOn}, ${input.overallRating}, ${input.notes})
      returning id
    `;
    if (!visit) throw new Error("Visit creation did not return a record");
    for (const [dimensionId, rating] of Object.entries(input.ratings)) {
      await transaction`
        insert into visit_ratings (visit_id, rating_dimension_id, rating)
        values (${visit.id}, ${dimensionId}, ${rating})
      `;
    }
    return visit;
  });
}

export async function deleteVisit(actor: Actor, visitId: string) {
  requireCapability(actor, "visits.manageOwn");
  const result = await getSqlClient()`
    delete from visits where id = ${visitId} and user_id = ${actor.id}
  `;
  if (!result.count) throw new VisitError("Visit not found");
}

export async function updateVisit(
  actor: Actor,
  visitId: string,
  raw: VisitInput,
) {
  requireCapability(actor, "visits.manageOwn");
  const input = visitSchema.parse(raw);
  if (input.visitedOn > new Date().toISOString().slice(0, 10)) {
    throw new VisitError("Visit date cannot be in the future");
  }
  await getSqlClient().begin(async (transaction) => {
    const [visit] = await transaction<{ place_id: string }[]>`
      select place_id from visits
       where id = ${visitId} and user_id = ${actor.id}
       for update
    `;
    if (!visit) throw new VisitError("Visit not found");
    const dimensions = await getCapabilities(transaction, visit.place_id);
    validateRatings(input.ratings, dimensions);
    await transaction`
      update visits set visited_on = ${input.visitedOn}, overall_rating = ${input.overallRating}, notes = ${input.notes}, updated_at = now()
       where id = ${visitId}
    `;
    await transaction`delete from visit_ratings where visit_id = ${visitId}`;
    for (const [dimensionId, rating] of Object.entries(input.ratings)) {
      await transaction`
        insert into visit_ratings (visit_id, rating_dimension_id, rating)
        values (${visitId}, ${dimensionId}, ${rating})
      `;
    }
  });
}

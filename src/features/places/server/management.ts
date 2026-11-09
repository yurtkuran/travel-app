import "server-only";
import { z } from "zod";
import { getSqlClient } from "@/db/client";
import { requireCapability, type Actor } from "@/features/auth/permissions";

const optional = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .transform((value) => value || null);
export const canonicalPlaceSchema = z.object({
  addressLine2: optional(120),
  categoryId: z.uuid(),
  cityId: z.uuid(),
  description: optional(5000),
  name: z.string().trim().min(1).max(160),
  phone: optional(50),
  postalCode: optional(32),
  shortSummary: optional(500),
  streetAddress: optional(200),
  typeLabel: optional(120),
});
export type CanonicalPlaceInput = z.input<typeof canonicalPlaceSchema>;
export class PlaceManagementError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "PlaceManagementError";
  }
}
const slugify = (value: string) =>
  value
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 180) || "place";

async function validateTaxonomy(
  transaction: import("postgres").TransactionSql<Record<string, never>>,
  cityId: string,
  categoryId: string,
) {
  const [row] = await transaction<
    { valid: boolean }[]
  >`select exists(select 1 from cities where id = ${cityId} and is_active) and exists(select 1 from categories where id = ${categoryId} and is_active) as valid`;
  if (!row?.valid)
    throw new PlaceManagementError("Select an active city and category");
}

export interface ManagedPlace {
  categoryId: string;
  categoryName: string;
  cityId: string;
  cityName: string;
  id: string;
  name: string;
  slug: string;
  status: string;
  shortSummary: string | null;
  description: string | null;
  typeLabel: string | null;
  streetAddress: string | null;
  addressLine2: string | null;
  postalCode: string | null;
  phone: string | null;
  updatedAt: string;
}

export async function listManagedPlaces(actor: Actor, query = "") {
  requireCapability(actor, "places.manageAny");
  return getSqlClient()<ManagedPlace[]>`
    select p.id, p.name, p.slug, p.status, p.city_id as "cityId", p.category_id as "categoryId", p.short_summary as "shortSummary", p.description, p.type_label as "typeLabel", p.street_address as "streetAddress", p.address_line_2 as "addressLine2", p.postal_code as "postalCode", p.phone, p.updated_at::text as "updatedAt", city.name as "cityName", category.name as "categoryName"
    from places p join cities city on city.id = p.city_id join categories category on category.id = p.category_id
    where p.status in ('published', 'unpublished') and (${query} = '' or position(lower(${query}) in lower(concat_ws(' ', p.name, city.name, category.name))) > 0)
    order by p.updated_at desc, p.name limit 100
  `;
}

export async function getManagedPlace(actor: Actor, placeId: string) {
  requireCapability(actor, "places.manageAny");
  const [place] = await getSqlClient()<ManagedPlace[]>`
    select p.id, p.name, p.slug, p.status, p.city_id as "cityId", p.category_id as "categoryId", p.short_summary as "shortSummary", p.description, p.type_label as "typeLabel", p.street_address as "streetAddress", p.address_line_2 as "addressLine2", p.postal_code as "postalCode", p.phone, p.updated_at::text as "updatedAt", city.name as "cityName", category.name as "categoryName"
    from places p join cities city on city.id = p.city_id join categories category on category.id = p.category_id where p.id = ${placeId}
  `;
  return place ?? null;
}

export async function createCanonicalPlace(
  actor: Actor,
  raw: CanonicalPlaceInput,
) {
  requireCapability(actor, "places.manageAny");
  requireCapability(actor, "places.publish");
  const input = canonicalPlaceSchema.parse(raw);
  return getSqlClient().begin(async (transaction) => {
    await validateTaxonomy(transaction, input.cityId, input.categoryId);
    const slug = slugify(input.name);
    const [place] = await transaction<
      { id: string }[]
    >`insert into places (name, slug, city_id, category_id, short_summary, description, type_label, street_address, address_line_2, postal_code, phone, status, created_by_user_id, updated_by_user_id, published_by_user_id, published_at) values (${input.name}, ${slug}, ${input.cityId}, ${input.categoryId}, ${input.shortSummary}, ${input.description}, ${input.typeLabel}, ${input.streetAddress}, ${input.addressLine2}, ${input.postalCode}, ${input.phone}, 'published', ${actor.id}, ${actor.id}, ${actor.id}, now()) returning id`;
    if (!place) throw new Error("Place creation did not return a record");
    await transaction`insert into audit_events (actor_type, actor_user_id, action, target_type, target_id) values ('user', ${actor.id}, 'place.created_published', 'place', ${place.id})`;
    return { id: place.id, slug };
  });
}

export async function updateCanonicalPlace(
  actor: Actor,
  placeId: string,
  raw: CanonicalPlaceInput,
) {
  requireCapability(actor, "places.manageAny");
  const input = canonicalPlaceSchema.parse(raw);
  return getSqlClient().begin(async (transaction) => {
    await validateTaxonomy(transaction, input.cityId, input.categoryId);
    const slug = slugify(input.name);
    const result =
      await transaction`update places set name=${input.name}, slug=${slug}, city_id=${input.cityId}, category_id=${input.categoryId}, short_summary=${input.shortSummary}, description=${input.description}, type_label=${input.typeLabel}, street_address=${input.streetAddress}, address_line_2=${input.addressLine2}, postal_code=${input.postalCode}, phone=${input.phone}, updated_by_user_id=${actor.id}, updated_at=now() where id=${placeId} and status in ('published','unpublished')`;
    if (!result.count)
      throw new PlaceManagementError("Canonical place not found");
    await transaction`insert into audit_events (actor_type, actor_user_id, action, target_type, target_id) values ('user', ${actor.id}, 'place.updated', 'place', ${placeId})`;
    return { id: placeId, slug };
  });
}

export async function setPlacePublication(
  actor: Actor,
  placeId: string,
  publish: boolean,
) {
  requireCapability(actor, "places.publish");
  await getSqlClient().begin(async (transaction) => {
    const expected = publish ? "unpublished" : "published";
    const next = publish ? "published" : "unpublished";
    const result =
      await transaction`update places set status=${next}, published_by_user_id=${publish ? actor.id : null}, published_at=${publish ? new Date().toISOString() : null}, updated_by_user_id=${actor.id}, updated_at=now() where id=${placeId} and status=${expected}`;
    if (!result.count)
      throw new PlaceManagementError(
        "Place is no longer in the expected publication state",
      );
    await transaction`insert into audit_events (actor_type, actor_user_id, action, target_type, target_id) values ('user', ${actor.id}, ${publish ? "place.republished" : "place.unpublished"}, 'place', ${placeId})`;
  });
}

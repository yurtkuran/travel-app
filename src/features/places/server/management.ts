import "server-only";
import { z } from "zod";
import { getSqlClient } from "@/db/client";
import { requireCapability, type Actor } from "@/features/auth/permissions";
import { isSafePublicHttpsUrl } from "@/features/places/server/submissions";

type Transaction = import("postgres").TransactionSql<Record<string, never>>;

const optional = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .transform((value) => value || null);
const optionalCoordinate = (minimum: number, maximum: number) =>
  z
    .string()
    .trim()
    .refine(
      (value) =>
        value === "" ||
        (Number.isFinite(Number(value)) &&
          Number(value) >= minimum &&
          Number(value) <= maximum),
      `Enter a value from ${minimum} to ${maximum}`,
    )
    .optional()
    .transform((value) => value || null);
const optionalHttpsUrl = z
  .string()
  .trim()
  .max(2048)
  .refine(
    (value) => value === "" || isSafePublicHttpsUrl(value),
    "Enter a public HTTPS URL without embedded credentials",
  )
  .optional()
  .transform((value) => value || null);
export const canonicalPlaceSchema = z
  .object({
    addressLine2: optional(120),
    categoryId: z.uuid(),
    cityId: z.uuid(),
    description: optional(5000),
    latitude: optionalCoordinate(-90, 90),
    longitude: optionalCoordinate(-180, 180),
    mapListing: optionalHttpsUrl,
    name: z.string().trim().min(1).max(160),
    officialWebsite: optionalHttpsUrl,
    phone: optional(50),
    postalCode: optional(32),
    shortSummary: optional(500),
    streetAddress: optional(200),
    typeLabel: optional(120),
  })
  .refine((value) => Boolean(value.latitude) === Boolean(value.longitude), {
    message: "Latitude and longitude must be supplied together",
    path: ["longitude"],
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
  latitude: string | null;
  longitude: string | null;
  mapListing: string | null;
  officialWebsite: string | null;
  updatedAt: string;
}

export async function listManagedPlaces(actor: Actor, query = "") {
  requireCapability(actor, "places.manageAny");
  return getSqlClient()<ManagedPlace[]>`
    select p.id, p.name, p.slug, p.status, p.city_id as "cityId", p.category_id as "categoryId", p.short_summary as "shortSummary", p.description, p.type_label as "typeLabel", p.street_address as "streetAddress", p.address_line_2 as "addressLine2", p.postal_code as "postalCode", p.phone, p.latitude::text as latitude, p.longitude::text as longitude, links."officialWebsite", links."mapListing", p.updated_at::text as "updatedAt", city.name as "cityName", category.name as "categoryName"
    from places p join cities city on city.id = p.city_id join categories category on category.id = p.category_id
    left join lateral (select max(url) filter (where type='official_website') as "officialWebsite", max(url) filter (where type='map_listing') as "mapListing" from place_links where place_id=p.id) links on true
    where p.status in ('published', 'unpublished') and (${query} = '' or position(lower(${query}) in lower(concat_ws(' ', p.name, city.name, category.name))) > 0)
    order by p.updated_at desc, p.name limit 100
  `;
}

export async function getManagedPlace(actor: Actor, placeId: string) {
  requireCapability(actor, "places.manageAny");
  const [place] = await getSqlClient()<ManagedPlace[]>`
    select p.id, p.name, p.slug, p.status, p.city_id as "cityId", p.category_id as "categoryId", p.short_summary as "shortSummary", p.description, p.type_label as "typeLabel", p.street_address as "streetAddress", p.address_line_2 as "addressLine2", p.postal_code as "postalCode", p.phone, p.latitude::text as latitude, p.longitude::text as longitude, links."officialWebsite", links."mapListing", p.updated_at::text as "updatedAt", city.name as "cityName", category.name as "categoryName"
    from places p join cities city on city.id = p.city_id join categories category on category.id = p.category_id
    left join lateral (select max(url) filter (where type='official_website') as "officialWebsite", max(url) filter (where type='map_listing') as "mapListing" from place_links where place_id=p.id) links on true
    where p.id = ${placeId}
  `;
  return place ?? null;
}

async function syncPrimaryLinks(
  transaction: Transaction,
  placeId: string,
  input: { mapListing: string | null; officialWebsite: string | null },
) {
  await transaction`
    delete from place_links
     where place_id=${placeId}
       and type in ('official_website', 'map_listing')
  `;
  if (input.officialWebsite) {
    await transaction`
      insert into place_links (place_id, type, url, display_order)
      values (${placeId}, 'official_website', ${input.officialWebsite}, 0)
    `;
  }
  if (input.mapListing) {
    await transaction`
      insert into place_links (place_id, type, url, display_order)
      values (${placeId}, 'map_listing', ${input.mapListing}, 1)
    `;
  }
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
    >`insert into places (name, slug, city_id, category_id, short_summary, description, type_label, street_address, address_line_2, postal_code, latitude, longitude, phone, status, created_by_user_id, updated_by_user_id, published_by_user_id, published_at) values (${input.name}, ${slug}, ${input.cityId}, ${input.categoryId}, ${input.shortSummary}, ${input.description}, ${input.typeLabel}, ${input.streetAddress}, ${input.addressLine2}, ${input.postalCode}, ${input.latitude}, ${input.longitude}, ${input.phone}, 'published', ${actor.id}, ${actor.id}, ${actor.id}, now()) returning id`;
    if (!place) throw new Error("Place creation did not return a record");
    await syncPrimaryLinks(transaction, place.id, input);
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
      await transaction`update places set name=${input.name}, slug=${slug}, city_id=${input.cityId}, category_id=${input.categoryId}, short_summary=${input.shortSummary}, description=${input.description}, type_label=${input.typeLabel}, street_address=${input.streetAddress}, address_line_2=${input.addressLine2}, postal_code=${input.postalCode}, latitude=${input.latitude}, longitude=${input.longitude}, phone=${input.phone}, updated_by_user_id=${actor.id}, updated_at=now() where id=${placeId} and status in ('published','unpublished')`;
    if (!result.count)
      throw new PlaceManagementError("Canonical place not found");
    await syncPrimaryLinks(transaction, placeId, input);
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

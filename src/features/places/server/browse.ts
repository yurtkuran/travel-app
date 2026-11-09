import "server-only";

import { z } from "zod";

import { getSqlClient } from "@/db/client";

const browseSchema = z.object({
  category: z.string().trim().max(180).default("").catch(""),
  city: z.string().trim().max(180).default("").catch(""),
  page: z.coerce.number().int().positive().default(1).catch(1),
  q: z.string().trim().max(200).default("").catch(""),
  rating: z.coerce.number().int().min(1).max(5).optional().catch(undefined),
  sort: z.enum(["recent", "name", "rating"]).default("recent").catch("recent"),
  type: z.string().trim().max(120).default("").catch(""),
});

export type BrowseInput = Record<string, unknown>;

export interface PublicPlaceCard {
  categoryName: string;
  cityName: string;
  coverAltText: string | null;
  coverHeight: number | null;
  coverStorageKey: string | null;
  coverWidth: number | null;
  id: string;
  name: string;
  ratingAverage: number | null;
  reviewCount: number;
  shortSummary: string | null;
  slug: string;
  typeLabel: string | null;
  visitCount: number;
}

export async function browsePublishedPlaces(
  raw: BrowseInput = {},
  viewerUserId?: string,
) {
  const input = browseSchema.parse(raw);
  const pageSize = 12;
  const offset = (input.page - 1) * pageSize;
  const sql = getSqlClient();
  const order =
    input.sort === "name"
      ? sql`place.name, place.id`
      : input.sort === "rating"
        ? sql`rating.average desc nulls last, rating.count desc, place.name`
        : sql`place.published_at desc nulls last, place.id desc`;
  const conditions = sql`
    place.status = 'published'
    and city.is_active
    and category.is_active
    and (${input.q} = '' or position(lower(${input.q}) in lower(concat_ws(' ', place.name, place.short_summary, place.description, city.name, city.region, city.country, category.name))) > 0)
    and (${input.city} = '' or city.slug = ${input.city})
    and (${input.category} = '' or category.slug = ${input.category})
    and (${input.type} = '' or position(lower(${input.type}) in lower(coalesce(place.type_label, ''))) > 0)
    and (${input.rating ?? null}::integer is null or rating.average >= ${input.rating ?? null}::integer)
  `;

  const [items, totals] = await Promise.all([
    sql<PublicPlaceCard[]>`
      select place.id, place.name, place.slug,
             place.short_summary as "shortSummary", place.type_label as "typeLabel",
             city.name as "cityName", category.name as "categoryName",
             rating.average as "ratingAverage", coalesce(rating.count, 0)::integer as "reviewCount",
             cover.storage_key as "coverStorageKey", cover.alt_text as "coverAltText",
             cover.width as "coverWidth", cover.height as "coverHeight",
             coalesce(personal.count, 0)::integer as "visitCount"
        from places place
        join cities city on city.id = place.city_id
        join categories category on category.id = place.category_id
        left join lateral (
          select round(avg(review.overall_rating), 2)::float as average,
                 count(*)::integer as count
            from reviews review
           where review.place_id = place.id
             and review.moderation_status = 'visible'
             and review.author_deleted_at is null
        ) rating on true
        left join lateral (
          select storage_key, alt_text, width, height
            from media
           where place_id = place.id and status = 'published'
           order by display_order, created_at, id limit 1
        ) cover on true
        left join lateral (
          select count(*)::integer as count from visits
           where place_id = place.id and user_id = ${viewerUserId ?? null}
        ) personal on ${viewerUserId ?? null}::text is not null
       where ${conditions}
       order by ${order}
       limit ${pageSize} offset ${offset}
    `,
    sql<{ count: number }[]>`
      select count(*)::integer as count
        from places place
        join cities city on city.id = place.city_id
        join categories category on category.id = place.category_id
        left join lateral (
          select round(avg(review.overall_rating), 2)::float as average
            from reviews review
           where review.place_id = place.id and review.moderation_status = 'visible' and review.author_deleted_at is null
        ) rating on true
       where ${conditions}
    `,
  ]);
  return {
    input,
    items,
    page: input.page,
    pageSize,
    total: totals[0]?.count ?? 0,
  };
}

export interface PublicTaxonomyItem {
  description: string | null;
  id: string;
  name: string;
  placeCount: number;
  slug: string;
  subtitle: string | null;
}

export async function listPublicCities() {
  return getSqlClient()<PublicTaxonomyItem[]>`
    select city.id, city.name, city.slug, null::text as description,
           concat_ws(', ', city.region, city.country) as subtitle,
           count(place.id)::integer as "placeCount"
      from cities city left join places place on place.city_id = city.id and place.status = 'published'
     where city.is_active
     group by city.id order by city.name, city.country
  `;
}

export async function listPublicCategories() {
  return getSqlClient()<PublicTaxonomyItem[]>`
    select category.id, category.name, category.slug, category.description,
           null::text as subtitle, count(place.id)::integer as "placeCount"
      from categories category left join places place on place.category_id = category.id and place.status = 'published'
     where category.is_active
     group by category.id order by category.display_order, category.name
  `;
}

export async function getPublicCity(slug: string) {
  return (await listPublicCities()).find((item) => item.slug === slug) ?? null;
}

export async function getPublicCategory(slug: string) {
  return (
    (await listPublicCategories()).find((item) => item.slug === slug) ?? null
  );
}

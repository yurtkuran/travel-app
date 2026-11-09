import "server-only";

import { createHash } from "node:crypto";

import type postgres from "postgres";
import { z } from "zod";

import { getSqlClient } from "@/db/client";
import { requireCapability, type Actor } from "@/features/auth/permissions";

type Transaction = postgres.TransactionSql<Record<string, never>>;

const compactText = (value: string) => value.trim().replace(/\s+/g, " ");
const requiredText = (maximum: number, label: string) =>
  z
    .string()
    .transform(compactText)
    .pipe(
      z
        .string()
        .min(1, `${label} is required`)
        .max(maximum, `${label} must be ${maximum} characters or fewer`),
    );
const optionalText = (maximum: number, label: string) =>
  z
    .string()
    .transform(compactText)
    .pipe(
      z
        .string()
        .max(maximum, `${label} must be ${maximum} characters or fewer`),
    )
    .transform((value) => value || undefined)
    .optional()
    .default("");

export const createCitySchema = z.object({
  country: requiredText(120, "Country"),
  countryCode: z
    .string()
    .trim()
    .toUpperCase()
    .refine(
      (value) => value === "" || /^[A-Z]{2}$/.test(value),
      "Country code must contain two letters",
    )
    .transform((value) => value || undefined)
    .optional()
    .default(""),
  name: requiredText(160, "City name"),
  region: optionalText(160, "Region"),
});

export const createCategorySchema = z.object({
  description: optionalText(500, "Description"),
  displayOrder: z.coerce
    .number()
    .int("Display order must be a whole number")
    .min(0, "Display order cannot be negative")
    .max(10000, "Display order must be 10,000 or less"),
  name: requiredText(80, "Category name"),
  ratingDimensionIds: z.array(z.uuid()).max(20).default([]),
});

const listSchema = z.object({
  page: z.coerce.number().int().positive().default(1).catch(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20).catch(20),
  q: z.string().trim().max(100).default("").catch(""),
  sort: z.enum(["name", "name_desc", "recent"]).default("name").catch("name"),
});

export type CreateCityInput = z.input<typeof createCitySchema>;
export type CreateCategoryInput = z.input<typeof createCategorySchema>;
export type TaxonomyListInput = z.input<typeof listSchema>;

export class TaxonomyConflictError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "TaxonomyConflictError";
  }
}

function slugify(value: string, maximum: number) {
  const slug = value
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, maximum)
    .replace(/-+$/g, "");

  if (slug) return slug;
  return `entry-${createHash("sha256").update(value).digest("hex").slice(0, 12)}`;
}

function withDeterministicSuffix(
  base: string,
  identity: string,
  maximum: number,
) {
  const suffix = createHash("sha256")
    .update(identity)
    .digest("hex")
    .slice(0, 8);
  return `${base.slice(0, maximum - suffix.length - 1).replace(/-+$/g, "")}-${suffix}`;
}

function isUniqueViolation(error: unknown) {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    error.code === "23505"
  );
}

async function availableCitySlug(
  transaction: Transaction,
  base: string,
  identity: string,
) {
  const [existing] = await transaction<{ exists: boolean }[]>`
    select exists(select 1 from cities where slug = ${base}) as exists
  `;
  return existing?.exists ? withDeterministicSuffix(base, identity, 180) : base;
}

async function availableCategorySlug(
  transaction: Transaction,
  base: string,
  identity: string,
) {
  const [existing] = await transaction<{ exists: boolean }[]>`
    select exists(select 1 from categories where slug = ${base}) as exists
  `;
  return existing?.exists ? withDeterministicSuffix(base, identity, 100) : base;
}

export async function createCity(actor: Actor, rawInput: CreateCityInput) {
  requireCapability(actor, "taxonomy.manage");
  const input = createCitySchema.parse(rawInput);
  const identity = [input.name, input.region, input.country]
    .filter(Boolean)
    .join("|")
    .toLocaleLowerCase("en-US");
  const baseSlug = slugify(
    [input.name, input.region, input.country].filter(Boolean).join(" "),
    180,
  );
  const sql = getSqlClient();

  try {
    return await sql.begin(async (transaction) => {
      const slug = await availableCitySlug(transaction, baseSlug, identity);
      const [city] = await transaction<{ id: string; slug: string }[]>`
        insert into cities (name, region, country, country_code, slug)
        values (
          ${input.name},
          ${input.region || null},
          ${input.country},
          ${input.countryCode || null},
          ${slug}
        )
        returning id, slug
      `;
      if (!city) throw new Error("City creation did not return a record");

      await transaction`
        insert into audit_events (actor_type, actor_user_id, action, target_type, target_id)
        values ('user', ${actor.id}, 'city.created', 'city', ${city.id})
      `;
      return city;
    });
  } catch (error) {
    if (isUniqueViolation(error)) {
      throw new TaxonomyConflictError(
        "A city with this name, region, and country already exists",
      );
    }
    throw error;
  }
}

export async function createCategory(
  actor: Actor,
  rawInput: CreateCategoryInput,
) {
  requireCapability(actor, "taxonomy.manage");
  const input = createCategorySchema.parse(rawInput);
  const identity = input.name.toLocaleLowerCase("en-US");
  const baseSlug = slugify(input.name, 100);
  const dimensionIds = [...new Set(input.ratingDimensionIds)];
  const sql = getSqlClient();

  try {
    return await sql.begin(async (transaction) => {
      if (dimensionIds.length) {
        const [available] = await transaction<{ count: number }[]>`
          select count(*)::integer as count
            from rating_dimensions
           where is_active
             and id in ${transaction(dimensionIds)}
        `;
        if (available?.count !== dimensionIds.length) {
          throw new Error("One or more rating dimensions are unavailable");
        }
      }

      const slug = await availableCategorySlug(transaction, baseSlug, identity);
      const [category] = await transaction<{ id: string; slug: string }[]>`
        insert into categories (name, slug, description, display_order)
        values (
          ${input.name},
          ${slug},
          ${input.description || null},
          ${input.displayOrder}
        )
        returning id, slug
      `;
      if (!category)
        throw new Error("Category creation did not return a record");

      if (dimensionIds.length) {
        await transaction`
          insert into category_rating_capabilities (category_id, rating_dimension_id)
          select ${category.id}, id
            from rating_dimensions
           where id in ${transaction(dimensionIds)}
        `;
      }

      await transaction`
        insert into audit_events (actor_type, actor_user_id, action, target_type, target_id)
        values ('user', ${actor.id}, 'category.created', 'category', ${category.id})
      `;
      return category;
    });
  } catch (error) {
    if (isUniqueViolation(error)) {
      throw new TaxonomyConflictError(
        "A category with this name already exists",
      );
    }
    throw error;
  }
}

export interface CityListItem {
  country: string;
  countryCode: string | null;
  id: string;
  isActive: boolean;
  name: string;
  region: string | null;
  slug: string;
}

export interface CategoryListItem {
  description: string | null;
  displayOrder: number;
  id: string;
  isActive: boolean;
  name: string;
  ratingDimensions: string[];
  slug: string;
}

export async function listCities(
  actor: Actor,
  rawInput: TaxonomyListInput = {},
) {
  requireCapability(actor, "taxonomy.manage");
  const input = listSchema.parse(rawInput);
  const offset = (input.page - 1) * input.pageSize;
  const sql = getSqlClient();
  const order =
    input.sort === "name_desc"
      ? sql`c.name desc, c.country, c.id`
      : input.sort === "recent"
        ? sql`c.created_at desc, c.id desc`
        : sql`c.name, c.country, c.id`;

  const [rows, totals] = await Promise.all([
    sql<CityListItem[]>`
      select c.id,
             c.name,
             c.region,
             c.country,
             c.country_code as "countryCode",
             c.slug,
             c.is_active as "isActive"
        from cities c
       where ${input.q} = ''
          or position(lower(${input.q}) in lower(concat_ws(' ', c.name, c.region, c.country))) > 0
       order by ${order}
       limit ${input.pageSize}
      offset ${offset}
    `,
    sql<{ count: number }[]>`
      select count(*)::integer as count
        from cities c
       where ${input.q} = ''
          or position(lower(${input.q}) in lower(concat_ws(' ', c.name, c.region, c.country))) > 0
    `,
  ]);

  return {
    items: rows,
    page: input.page,
    pageSize: input.pageSize,
    total: totals[0]?.count ?? 0,
  };
}

export async function listCategories(
  actor: Actor,
  rawInput: TaxonomyListInput = {},
) {
  requireCapability(actor, "taxonomy.manage");
  const input = listSchema.parse(rawInput);
  const offset = (input.page - 1) * input.pageSize;
  const sql = getSqlClient();
  const order =
    input.sort === "name_desc"
      ? sql`c.name desc, c.id`
      : input.sort === "recent"
        ? sql`c.created_at desc, c.id desc`
        : sql`c.display_order, c.name, c.id`;

  const [rows, totals] = await Promise.all([
    sql<CategoryListItem[]>`
      select c.id,
             c.name,
             c.slug,
             c.description,
             c.display_order as "displayOrder",
             c.is_active as "isActive",
             coalesce(
               array_agg(rd.name order by rd.display_order)
                 filter (where crc.enabled and rd.is_active),
               array[]::varchar[]
             ) as "ratingDimensions"
        from categories c
        left join category_rating_capabilities crc on crc.category_id = c.id
        left join rating_dimensions rd on rd.id = crc.rating_dimension_id
       where ${input.q} = ''
          or position(lower(${input.q}) in lower(concat_ws(' ', c.name, c.description))) > 0
       group by c.id
       order by ${order}
       limit ${input.pageSize}
      offset ${offset}
    `,
    sql<{ count: number }[]>`
      select count(*)::integer as count
        from categories c
       where ${input.q} = ''
          or position(lower(${input.q}) in lower(concat_ws(' ', c.name, c.description))) > 0
    `,
  ]);

  return {
    items: rows,
    page: input.page,
    pageSize: input.pageSize,
    total: totals[0]?.count ?? 0,
  };
}

export async function listActiveRatingDimensions(actor: Actor) {
  requireCapability(actor, "taxonomy.manage");
  return getSqlClient()<
    { description: string | null; id: string; name: string }[]
  >`
    select id, name, description
      from rating_dimensions
     where is_active
     order by display_order, name
  `;
}

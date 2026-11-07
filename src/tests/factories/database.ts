import { randomUUID } from "node:crypto";

import { getSqlClient } from "@/db/client";

export type TestSqlClient = ReturnType<typeof getSqlClient>;

export const seededTaxonomy = {
  categories: {
    restaurant: "00000000-0000-4000-8000-000000000201",
    bar: "00000000-0000-4000-8000-000000000202",
    hotel: "00000000-0000-4000-8000-000000000203",
    shop: "00000000-0000-4000-8000-000000000204",
    artsCulture: "00000000-0000-4000-8000-000000000205",
    attraction: "00000000-0000-4000-8000-000000000206",
  },
  dimensions: {
    food: "00000000-0000-4000-8000-000000000101",
    atmosphere: "00000000-0000-4000-8000-000000000102",
    service: "00000000-0000-4000-8000-000000000103",
  },
} as const;

export async function createTestUser(
  sql: TestSqlClient,
  name = "Test Traveler",
) {
  const id = `test-user-${randomUUID()}`;
  const email = `${id}@example.test`;

  await sql`
    insert into "user" (id, name, email, email_verified)
    values (${id}, ${name}, ${email}, true)
  `;

  return { id, email, name };
}

export async function createTestCity(sql: TestSqlClient) {
  const suffix = randomUUID();
  const [city] = await sql<{ id: string }[]>`
    insert into cities (name, region, country, country_code, slug)
    values (
      ${`Test City ${suffix}`},
      'Test Region',
      'United States',
      'US',
      ${`test-city-${suffix}`}
    )
    returning id
  `;

  if (!city) throw new Error("Test city was not created");
  return city;
}

export async function createTestPlace(
  sql: TestSqlClient,
  input: {
    cityId: string;
    categoryId?: string;
    createdByUserId?: string;
    status?: "draft" | "published";
  },
) {
  const suffix = randomUUID();
  const status = input.status ?? "published";
  const categoryId = input.categoryId ?? seededTaxonomy.categories.restaurant;

  const [place] = await sql<{ id: string }[]>`
    insert into places (
      name,
      slug,
      city_id,
      category_id,
      status,
      created_by_user_id,
      published_by_user_id,
      published_at
    ) values (
      ${`Test Place ${suffix}`},
      ${`test-place-${suffix}`},
      ${input.cityId},
      ${categoryId},
      ${status},
      ${input.createdByUserId ?? null},
      ${status === "published" ? (input.createdByUserId ?? null) : null},
      ${status === "published" ? new Date() : null}
    )
    returning id
  `;

  if (!place) throw new Error("Test place was not created");
  return place;
}

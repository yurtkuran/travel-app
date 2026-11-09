import { randomUUID } from "node:crypto";

import { afterAll, beforeAll, describe, expect, test } from "vitest";

import { getSqlClient } from "@/db/client";
import { AuthorizationError, type Actor } from "@/features/auth/permissions";
import {
  createCategory,
  createCity,
  listCategories,
  listCities,
  TaxonomyConflictError,
} from "@/features/taxonomy/server/taxonomy";

import { seededTaxonomy } from "../factories/database";

const sql = getSqlClient();
const suffix = randomUUID();
const admin: Actor = { id: `taxonomy-admin-${suffix}`, role: "admin" };
const user: Actor = { id: `taxonomy-user-${suffix}`, role: "user" };
const createdCityIds: string[] = [];
const createdCategoryIds: string[] = [];

describe("taxonomy administration", () => {
  beforeAll(async () => {
    await sql`
      insert into "user" (id, name, email, email_verified, role)
      values
        (${admin.id}, 'Taxonomy Admin', ${`${admin.id}@example.test`}, true, 'user'),
        (${user.id}, 'Taxonomy User', ${`${user.id}@example.test`}, true, 'user')
    `;
  });

  afterAll(async () => {
    if (createdCategoryIds.length) {
      await sql`delete from audit_events where target_type = 'category' and target_id in ${sql(createdCategoryIds)}`;
      await sql`delete from categories where id in ${sql(createdCategoryIds)}`;
    }
    if (createdCityIds.length) {
      await sql`delete from audit_events where target_type = 'city' and target_id in ${sql(createdCityIds)}`;
      await sql`delete from cities where id in ${sql(createdCityIds)}`;
    }
    await sql`delete from "user" where id in ${sql([admin.id, user.id])}`;
    await sql.end();
  });

  test("normalizes and transactionally creates an audited city", async () => {
    const city = await createCity(admin, {
      country: "  United   States  ",
      countryCode: "us",
      name: `  Phase Five   City ${suffix}  `,
      region: "  New   York  ",
    });
    createdCityIds.push(city.id);

    const [stored] = await sql<
      {
        action: string;
        country: string;
        country_code: string;
        name: string;
        region: string;
        slug: string;
      }[]
    >`
      select c.name, c.region, c.country, c.country_code, c.slug, ae.action
        from cities c
        join audit_events ae on ae.target_id = c.id::text and ae.target_type = 'city'
       where c.id = ${city.id}
    `;

    expect(stored).toMatchObject({
      action: "city.created",
      country: "United States",
      country_code: "US",
      name: `Phase Five City ${suffix}`,
      region: "New York",
      slug: `phase-five-city-${suffix}-new-york-united-states`,
    });
  });

  test("rejects duplicate cities with a friendly domain error", async () => {
    await expect(
      createCity(admin, {
        country: "United States",
        countryCode: "US",
        name: `Phase Five City ${suffix}`,
        region: "New York",
      }),
    ).rejects.toBeInstanceOf(TaxonomyConflictError);
  });

  test("requires taxonomy capability for mutations", async () => {
    await expect(
      createCity(user, {
        country: "France",
        countryCode: "FR",
        name: `Unauthorized City ${suffix}`,
        region: "",
      }),
    ).rejects.toBeInstanceOf(AuthorizationError);
  });

  test("creates a category with selected rating capabilities", async () => {
    const category = await createCategory(admin, {
      description: "  A category created during integration testing.  ",
      displayOrder: "75",
      name: `  Phase Five Category ${suffix}  `,
      ratingDimensionIds: [
        seededTaxonomy.dimensions.atmosphere,
        seededTaxonomy.dimensions.service,
      ],
    });
    createdCategoryIds.push(category.id);

    const capabilities = await sql<{ key: string }[]>`
      select rd.key
        from category_rating_capabilities crc
        join rating_dimensions rd on rd.id = crc.rating_dimension_id
       where crc.category_id = ${category.id}
       order by rd.key
    `;
    const [audit] = await sql<{ action: string }[]>`
      select action from audit_events
       where target_type = 'category' and target_id = ${category.id}
    `;

    expect(capabilities.map(({ key }) => key)).toEqual([
      "atmosphere",
      "service",
    ]);
    expect(audit?.action).toBe("category.created");
  });

  test("lists and searches taxonomy through allowlisted pagination", async () => {
    const cities = await listCities(admin, {
      page: 1,
      pageSize: 5,
      q: suffix,
    });
    const categories = await listCategories(admin, {
      page: 1,
      pageSize: 5,
      q: suffix,
      sort: "recent",
    });

    expect(cities.total).toBe(1);
    expect(cities.items[0]).toMatchObject({
      countryCode: "US",
      isActive: true,
    });
    expect(categories.total).toBe(1);
    expect(categories.items[0]).toMatchObject({
      displayOrder: 75,
      isActive: true,
      ratingDimensions: ["Atmosphere", "Service"],
    });
  });
});

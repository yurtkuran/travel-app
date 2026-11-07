import { relations, sql } from "drizzle-orm";
import {
  boolean,
  check,
  foreignKey,
  index,
  integer,
  pgTable,
  primaryKey,
  timestamp,
  uniqueIndex,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";

export const cities = pgTable(
  "cities",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    name: varchar("name", { length: 160 }).notNull(),
    region: varchar("region", { length: 160 }),
    country: varchar("country", { length: 120 }).notNull(),
    countryCode: varchar("country_code", { length: 2 }),
    slug: varchar("slug", { length: 180 }).notNull(),
    isActive: boolean("is_active").default(true).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    uniqueIndex("cities_slug_unique").on(table.slug),
    uniqueIndex("cities_natural_key_unique").on(
      sql`lower(${table.name})`,
      sql`lower(coalesce(${table.region}, ''))`,
      sql`lower(${table.country})`,
    ),
    index("cities_active_name_idx").on(table.isActive, table.name),
    check(
      "cities_country_code_check",
      sql`${table.countryCode} is null or ${table.countryCode} ~ '^[A-Z]{2}$'`,
    ),
  ],
);

export const categories = pgTable(
  "categories",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    name: varchar("name", { length: 80 }).notNull(),
    slug: varchar("slug", { length: 100 }).notNull(),
    description: varchar("description", { length: 500 }),
    displayOrder: integer("display_order").default(0).notNull(),
    isActive: boolean("is_active").default(true).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    uniqueIndex("categories_name_unique").on(sql`lower(${table.name})`),
    uniqueIndex("categories_slug_unique").on(table.slug),
    index("categories_active_order_idx").on(table.isActive, table.displayOrder),
    check("categories_display_order_check", sql`${table.displayOrder} >= 0`),
  ],
);

export const ratingDimensions = pgTable(
  "rating_dimensions",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    key: varchar("key", { length: 50 }).notNull(),
    name: varchar("name", { length: 80 }).notNull(),
    description: varchar("description", { length: 500 }),
    displayOrder: integer("display_order").default(0).notNull(),
    isActive: boolean("is_active").default(true).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    uniqueIndex("rating_dimensions_key_unique").on(table.key),
    uniqueIndex("rating_dimensions_name_unique").on(sql`lower(${table.name})`),
    index("rating_dimensions_active_order_idx").on(
      table.isActive,
      table.displayOrder,
    ),
    check(
      "rating_dimensions_display_order_check",
      sql`${table.displayOrder} >= 0`,
    ),
  ],
);

export const categoryRatingCapabilities = pgTable(
  "category_rating_capabilities",
  {
    categoryId: uuid("category_id")
      .notNull()
      .references(() => categories.id, { onDelete: "cascade" }),
    ratingDimensionId: uuid("rating_dimension_id").notNull(),
    enabled: boolean("enabled").default(true).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    primaryKey({
      name: "category_rating_capabilities_pk",
      columns: [table.categoryId, table.ratingDimensionId],
    }),
    foreignKey({
      name: "category_rating_capability_dimension_fk",
      columns: [table.ratingDimensionId],
      foreignColumns: [ratingDimensions.id],
    }).onDelete("restrict"),
    index("category_rating_capabilities_enabled_idx").on(
      table.categoryId,
      table.enabled,
    ),
  ],
);

export const categoriesRelations = relations(categories, ({ many }) => ({
  ratingCapabilities: many(categoryRatingCapabilities),
}));

export const ratingDimensionsRelations = relations(
  ratingDimensions,
  ({ many }) => ({
    categoryCapabilities: many(categoryRatingCapabilities),
  }),
);

export const categoryRatingCapabilitiesRelations = relations(
  categoryRatingCapabilities,
  ({ one }) => ({
    category: one(categories, {
      fields: [categoryRatingCapabilities.categoryId],
      references: [categories.id],
    }),
    ratingDimension: one(ratingDimensions, {
      fields: [categoryRatingCapabilities.ratingDimensionId],
      references: [ratingDimensions.id],
    }),
  }),
);

import { relations, sql } from "drizzle-orm";
import {
  boolean,
  check,
  date,
  index,
  integer,
  jsonb,
  numeric,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";

import { users } from "./auth";
import {
  linkTypeEnum,
  mediaStatusEnum,
  placeStatusEnum,
  proposalStatusEnum,
  recommendationSourceTypeEnum,
} from "./enums";
import { categories, cities } from "./taxonomy";

export const places = pgTable(
  "places",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    name: varchar("name", { length: 160 }),
    slug: varchar("slug", { length: 180 }),
    cityId: uuid("city_id").references(() => cities.id, {
      onDelete: "restrict",
    }),
    categoryId: uuid("category_id").references(() => categories.id, {
      onDelete: "restrict",
    }),
    shortSummary: varchar("short_summary", { length: 500 }),
    description: text("description"),
    typeLabel: varchar("type_label", { length: 120 }),
    streetAddress: varchar("street_address", { length: 200 }),
    addressLine2: varchar("address_line_2", { length: 120 }),
    postalCode: varchar("postal_code", { length: 32 }),
    latitude: numeric("latitude", { precision: 9, scale: 6 }),
    longitude: numeric("longitude", { precision: 10, scale: 6 }),
    phone: varchar("phone", { length: 50 }),
    publicAttributionLabel: varchar("public_attribution_label", {
      length: 160,
    }),
    publicAttributionUrl: varchar("public_attribution_url", { length: 2048 }),
    status: placeStatusEnum("status").default("draft").notNull(),
    submittedByUserId: text("submitted_by_user_id").references(() => users.id, {
      onDelete: "set null",
    }),
    createdByUserId: text("created_by_user_id").references(() => users.id, {
      onDelete: "set null",
    }),
    updatedByUserId: text("updated_by_user_id").references(() => users.id, {
      onDelete: "set null",
    }),
    publishedByUserId: text("published_by_user_id").references(() => users.id, {
      onDelete: "set null",
    }),
    moderatedByUserId: text("moderated_by_user_id").references(() => users.id, {
      onDelete: "set null",
    }),
    moderationReason: text("moderation_reason"),
    submittedAt: timestamp("submitted_at", { withTimezone: true }),
    publishedAt: timestamp("published_at", { withTimezone: true }),
    moderatedAt: timestamp("moderated_at", { withTimezone: true }),
    archivedAt: timestamp("archived_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    index("places_slug_idx").on(table.slug),
    index("places_public_browse_idx").on(
      table.status,
      table.cityId,
      table.categoryId,
    ),
    index("places_city_name_idx").on(table.cityId, table.name),
    index("places_category_name_idx").on(table.categoryId, table.name),
    index("places_submitter_status_idx").on(
      table.submittedByUserId,
      table.status,
    ),
    index("places_moderation_queue_idx").on(table.status, table.submittedAt),
    check(
      "places_non_draft_identity_check",
      sql`${table.status} = 'draft' or (${table.name} is not null and char_length(trim(${table.name})) between 1 and 160 and ${table.cityId} is not null and ${table.categoryId} is not null)`,
    ),
    check(
      "places_public_slug_check",
      sql`${table.status} not in ('published', 'unpublished', 'archived') or ${table.slug} is not null`,
    ),
    check(
      "places_description_length_check",
      sql`${table.description} is null or char_length(${table.description}) <= 5000`,
    ),
    check(
      "places_moderation_reason_length_check",
      sql`${table.moderationReason} is null or char_length(${table.moderationReason}) <= 2000`,
    ),
    check(
      "places_coordinate_pair_check",
      sql`(${table.latitude} is null and ${table.longitude} is null) or (${table.latitude} is not null and ${table.longitude} is not null)`,
    ),
    check(
      "places_latitude_check",
      sql`${table.latitude} is null or ${table.latitude} between -90 and 90`,
    ),
    check(
      "places_longitude_check",
      sql`${table.longitude} is null or ${table.longitude} between -180 and 180`,
    ),
    check(
      "places_public_attribution_url_check",
      sql`${table.publicAttributionUrl} is null or ${table.publicAttributionUrl} ~ '^https://'`,
    ),
  ],
);

export const placeSubmissionProvenance = pgTable(
  "place_submission_provenance",
  {
    placeId: uuid("place_id")
      .primaryKey()
      .references(() => places.id, { onDelete: "cascade" }),
    submitterUserId: text("submitter_user_id").references(() => users.id, {
      onDelete: "set null",
    }),
    sourceType: recommendationSourceTypeEnum("source_type"),
    sourceName: varchar("source_name", { length: 160 }),
    sourceUrl: varchar("source_url", { length: 2048 }),
    recommendedOn: date("recommended_on"),
    submissionNotes: text("submission_notes"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    index("place_submission_provenance_submitter_idx").on(
      table.submitterUserId,
    ),
    check(
      "place_submission_provenance_url_check",
      sql`${table.sourceUrl} is null or ${table.sourceUrl} ~ '^https://'`,
    ),
    check(
      "place_submission_provenance_notes_length_check",
      sql`${table.submissionNotes} is null or char_length(${table.submissionNotes}) <= 5000`,
    ),
  ],
);

export const placeLinks = pgTable(
  "place_links",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    placeId: uuid("place_id")
      .notNull()
      .references(() => places.id, { onDelete: "cascade" }),
    type: linkTypeEnum("type").notNull(),
    url: varchar("url", { length: 2048 }).notNull(),
    label: varchar("label", { length: 80 }),
    displayOrder: integer("display_order").default(0).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    uniqueIndex("place_links_identity_unique").on(
      table.placeId,
      table.type,
      sql`lower(coalesce(${table.label}, ''))`,
    ),
    index("place_links_order_idx").on(table.placeId, table.displayOrder),
    check("place_links_url_check", sql`${table.url} ~ '^https://'`),
    check("place_links_display_order_check", sql`${table.displayOrder} >= 0`),
  ],
);

export const placeChangeProposals = pgTable(
  "place_change_proposals",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    placeId: uuid("place_id")
      .notNull()
      .references(() => places.id, { onDelete: "restrict" }),
    proposedByUserId: text("proposed_by_user_id").references(() => users.id, {
      onDelete: "set null",
    }),
    status: proposalStatusEnum("status").default("draft").notNull(),
    proposedValues: jsonb("proposed_values")
      .$type<Record<string, unknown>>()
      .notNull(),
    submitterNotes: text("submitter_notes"),
    decisionReason: text("decision_reason"),
    decidedByUserId: text("decided_by_user_id").references(() => users.id, {
      onDelete: "set null",
    }),
    submittedAt: timestamp("submitted_at", { withTimezone: true }),
    decidedAt: timestamp("decided_at", { withTimezone: true }),
    withdrawnAt: timestamp("withdrawn_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    index("place_change_proposals_owner_idx").on(
      table.proposedByUserId,
      table.status,
    ),
    index("place_change_proposals_queue_idx").on(
      table.status,
      table.submittedAt,
    ),
    index("place_change_proposals_place_idx").on(
      table.placeId,
      table.createdAt,
    ),
    check(
      "place_change_proposals_notes_length_check",
      sql`${table.submitterNotes} is null or char_length(${table.submitterNotes}) <= 5000`,
    ),
    check(
      "place_change_proposals_reason_length_check",
      sql`${table.decisionReason} is null or char_length(${table.decisionReason}) <= 2000`,
    ),
  ],
);

export const media = pgTable(
  "media",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    placeId: uuid("place_id")
      .notNull()
      .references(() => places.id, { onDelete: "cascade" }),
    proposalId: uuid("proposal_id").references(() => placeChangeProposals.id, {
      onDelete: "cascade",
    }),
    uploadedByUserId: text("uploaded_by_user_id").references(() => users.id, {
      onDelete: "set null",
    }),
    storageKey: varchar("storage_key", { length: 512 }).notNull(),
    mimeType: varchar("mime_type", { length: 100 }).notNull(),
    width: integer("width").notNull(),
    height: integer("height").notNull(),
    caption: varchar("caption", { length: 500 }),
    altText: varchar("alt_text", { length: 500 }),
    isDecorative: boolean("is_decorative").default(false).notNull(),
    displayOrder: integer("display_order").default(0).notNull(),
    status: mediaStatusEnum("status").default("draft").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    uniqueIndex("media_storage_key_unique").on(table.storageKey),
    index("media_place_status_order_idx").on(
      table.placeId,
      table.status,
      table.displayOrder,
    ),
    index("media_proposal_idx").on(table.proposalId),
    check("media_width_check", sql`${table.width} > 0`),
    check("media_height_check", sql`${table.height} > 0`),
    check("media_display_order_check", sql`${table.displayOrder} >= 0`),
    check(
      "media_alt_text_check",
      sql`${table.isDecorative} or (${table.altText} is not null and char_length(trim(${table.altText})) > 0)`,
    ),
  ],
);

export const placesRelations = relations(places, ({ many, one }) => ({
  city: one(cities, { fields: [places.cityId], references: [cities.id] }),
  category: one(categories, {
    fields: [places.categoryId],
    references: [categories.id],
  }),
  links: many(placeLinks),
  media: many(media),
  changeProposals: many(placeChangeProposals),
  provenance: one(placeSubmissionProvenance),
}));

export const placeLinksRelations = relations(placeLinks, ({ one }) => ({
  place: one(places, { fields: [placeLinks.placeId], references: [places.id] }),
}));

export const placeSubmissionProvenanceRelations = relations(
  placeSubmissionProvenance,
  ({ one }) => ({
    place: one(places, {
      fields: [placeSubmissionProvenance.placeId],
      references: [places.id],
    }),
  }),
);

export const placeChangeProposalsRelations = relations(
  placeChangeProposals,
  ({ many, one }) => ({
    place: one(places, {
      fields: [placeChangeProposals.placeId],
      references: [places.id],
    }),
    media: many(media),
  }),
);

export const mediaRelations = relations(media, ({ one }) => ({
  place: one(places, { fields: [media.placeId], references: [places.id] }),
  proposal: one(placeChangeProposals, {
    fields: [media.proposalId],
    references: [placeChangeProposals.id],
  }),
}));

import { relations, sql } from "drizzle-orm";
import {
  check,
  date,
  index,
  integer,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

import { users } from "./auth";
import { reviewModerationStatusEnum } from "./enums";
import { places } from "./places";
import { ratingDimensions } from "./taxonomy";

export const reviews = pgTable(
  "reviews",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    placeId: uuid("place_id")
      .notNull()
      .references(() => places.id, { onDelete: "restrict" }),
    overallRating: integer("overall_rating").notNull(),
    text: text("text"),
    moderationStatus: reviewModerationStatusEnum("moderation_status")
      .default("visible")
      .notNull(),
    moderatedByUserId: text("moderated_by_user_id").references(() => users.id, {
      onDelete: "set null",
    }),
    moderationReason: text("moderation_reason"),
    moderatedAt: timestamp("moderated_at", { withTimezone: true }),
    authorDeletedAt: timestamp("author_deleted_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    uniqueIndex("reviews_user_place_unique").on(table.userId, table.placeId),
    index("reviews_public_place_idx").on(
      table.placeId,
      table.moderationStatus,
      table.authorDeletedAt,
    ),
    index("reviews_user_updated_idx").on(table.userId, table.updatedAt),
    index("reviews_moderation_queue_idx").on(
      table.moderationStatus,
      table.updatedAt,
    ),
    check(
      "reviews_overall_rating_check",
      sql`${table.overallRating} between 1 and 5`,
    ),
    check(
      "reviews_text_length_check",
      sql`${table.text} is null or char_length(${table.text}) <= 5000`,
    ),
    check(
      "reviews_moderation_reason_length_check",
      sql`${table.moderationReason} is null or char_length(${table.moderationReason}) <= 2000`,
    ),
  ],
);

export const reviewRatings = pgTable(
  "review_ratings",
  {
    reviewId: uuid("review_id")
      .notNull()
      .references(() => reviews.id, { onDelete: "cascade" }),
    ratingDimensionId: uuid("rating_dimension_id")
      .notNull()
      .references(() => ratingDimensions.id, { onDelete: "restrict" }),
    rating: integer("rating").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    primaryKey({
      name: "review_ratings_pk",
      columns: [table.reviewId, table.ratingDimensionId],
    }),
    index("review_ratings_dimension_idx").on(table.ratingDimensionId),
    check("review_ratings_value_check", sql`${table.rating} between 1 and 5`),
  ],
);

export const visits = pgTable(
  "visits",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    placeId: uuid("place_id")
      .notNull()
      .references(() => places.id, { onDelete: "restrict" }),
    visitedOn: date("visited_on").notNull(),
    overallRating: integer("overall_rating").notNull(),
    notes: text("notes"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    index("visits_owner_date_idx").on(table.userId, table.visitedOn),
    index("visits_owner_place_date_idx").on(
      table.userId,
      table.placeId,
      table.visitedOn,
    ),
    check(
      "visits_overall_rating_check",
      sql`${table.overallRating} between 1 and 5`,
    ),
    check(
      "visits_notes_length_check",
      sql`${table.notes} is null or char_length(${table.notes}) <= 5000`,
    ),
  ],
);

export const visitRatings = pgTable(
  "visit_ratings",
  {
    visitId: uuid("visit_id")
      .notNull()
      .references(() => visits.id, { onDelete: "cascade" }),
    ratingDimensionId: uuid("rating_dimension_id")
      .notNull()
      .references(() => ratingDimensions.id, { onDelete: "restrict" }),
    rating: integer("rating").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    primaryKey({
      name: "visit_ratings_pk",
      columns: [table.visitId, table.ratingDimensionId],
    }),
    index("visit_ratings_dimension_idx").on(table.ratingDimensionId),
    check("visit_ratings_value_check", sql`${table.rating} between 1 and 5`),
  ],
);

export const reviewsRelations = relations(reviews, ({ many, one }) => ({
  user: one(users, { fields: [reviews.userId], references: [users.id] }),
  place: one(places, { fields: [reviews.placeId], references: [places.id] }),
  ratings: many(reviewRatings),
}));

export const reviewRatingsRelations = relations(reviewRatings, ({ one }) => ({
  review: one(reviews, {
    fields: [reviewRatings.reviewId],
    references: [reviews.id],
  }),
  ratingDimension: one(ratingDimensions, {
    fields: [reviewRatings.ratingDimensionId],
    references: [ratingDimensions.id],
  }),
}));

export const visitsRelations = relations(visits, ({ many, one }) => ({
  user: one(users, { fields: [visits.userId], references: [users.id] }),
  place: one(places, { fields: [visits.placeId], references: [places.id] }),
  ratings: many(visitRatings),
}));

export const visitRatingsRelations = relations(visitRatings, ({ one }) => ({
  visit: one(visits, {
    fields: [visitRatings.visitId],
    references: [visits.id],
  }),
  ratingDimension: one(ratingDimensions, {
    fields: [visitRatings.ratingDimensionId],
    references: [ratingDimensions.id],
  }),
}));

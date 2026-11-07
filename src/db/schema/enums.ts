import { pgEnum } from "drizzle-orm/pg-core";

export const accountSetupPurposeEnum = pgEnum("account_setup_purpose", [
  "initial_setup",
  "admin_recovery",
]);

export const auditActorTypeEnum = pgEnum("audit_actor_type", [
  "user",
  "system",
]);

export const linkTypeEnum = pgEnum("place_link_type", [
  "official_website",
  "map_listing",
  "instagram",
  "reservation",
  "directory_listing",
  "other",
]);

export const mediaStatusEnum = pgEnum("media_status", [
  "draft",
  "published",
  "archived",
]);

export const placeStatusEnum = pgEnum("place_status", [
  "draft",
  "pending_review",
  "published",
  "rejected",
  "withdrawn",
  "unpublished",
  "archived",
]);

export const proposalStatusEnum = pgEnum("proposal_status", [
  "draft",
  "pending_review",
  "approved",
  "rejected",
  "withdrawn",
]);

export const recommendationSourceTypeEnum = pgEnum(
  "recommendation_source_type",
  ["friend", "instagram", "publication", "website", "guidebook", "other"],
);

export const reviewModerationStatusEnum = pgEnum("review_moderation_status", [
  "visible",
  "hidden",
  "removed",
]);

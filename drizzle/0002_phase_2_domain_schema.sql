CREATE TYPE "public"."account_setup_purpose" AS ENUM('initial_setup', 'admin_recovery');--> statement-breakpoint
CREATE TYPE "public"."audit_actor_type" AS ENUM('user', 'system');--> statement-breakpoint
CREATE TYPE "public"."place_link_type" AS ENUM('official_website', 'map_listing', 'instagram', 'reservation', 'directory_listing', 'other');--> statement-breakpoint
CREATE TYPE "public"."media_status" AS ENUM('draft', 'published', 'archived');--> statement-breakpoint
CREATE TYPE "public"."place_status" AS ENUM('draft', 'pending_review', 'published', 'rejected', 'withdrawn', 'unpublished', 'archived');--> statement-breakpoint
CREATE TYPE "public"."proposal_status" AS ENUM('draft', 'pending_review', 'approved', 'rejected', 'withdrawn');--> statement-breakpoint
CREATE TYPE "public"."recommendation_source_type" AS ENUM('friend', 'instagram', 'publication', 'website', 'guidebook', 'other');--> statement-breakpoint
CREATE TYPE "public"."review_moderation_status" AS ENUM('visible', 'hidden', 'removed');--> statement-breakpoint
CREATE TABLE "account" (
	"id" text PRIMARY KEY NOT NULL,
	"account_id" text NOT NULL,
	"provider_id" text NOT NULL,
	"user_id" text NOT NULL,
	"access_token" text,
	"refresh_token" text,
	"id_token" text,
	"access_token_expires_at" timestamp with time zone,
	"refresh_token_expires_at" timestamp with time zone,
	"scope" text,
	"password" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "session" (
	"id" text PRIMARY KEY NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"token" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"ip_address" text,
	"user_agent" text,
	"user_id" text NOT NULL,
	"impersonated_by" text
);
--> statement-breakpoint
CREATE TABLE "user" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"email" text NOT NULL,
	"email_verified" boolean DEFAULT false NOT NULL,
	"image" text,
	"role" text DEFAULT 'user' NOT NULL,
	"banned" boolean DEFAULT false NOT NULL,
	"ban_reason" text,
	"ban_expires" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "user_role_check" CHECK ("user"."role" in ('user', 'admin')),
	CONSTRAINT "user_name_length_check" CHECK (char_length("user"."name") between 1 and 160)
);
--> statement-breakpoint
CREATE TABLE "verification" (
	"id" text PRIMARY KEY NOT NULL,
	"identifier" text NOT NULL,
	"value" text NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "account_setup_tokens" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"token_hash" varchar(128) NOT NULL,
	"purpose" "account_setup_purpose" DEFAULT 'initial_setup' NOT NULL,
	"created_by_user_id" text,
	"expires_at" timestamp with time zone NOT NULL,
	"consumed_at" timestamp with time zone,
	"revoked_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "account_setup_tokens_terminal_state_check" CHECK (not ("account_setup_tokens"."consumed_at" is not null and "account_setup_tokens"."revoked_at" is not null))
);
--> statement-breakpoint
CREATE TABLE "audit_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"actor_type" "audit_actor_type" NOT NULL,
	"actor_user_id" text,
	"action" varchar(100) NOT NULL,
	"target_type" varchar(80) NOT NULL,
	"target_id" varchar(160),
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "audit_events_actor_check" CHECK (("audit_events"."actor_type" = 'system' and "audit_events"."actor_user_id" is null) or ("audit_events"."actor_type" = 'user' and "audit_events"."actor_user_id" is not null))
);
--> statement-breakpoint
CREATE TABLE "media" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"place_id" uuid NOT NULL,
	"proposal_id" uuid,
	"uploaded_by_user_id" text,
	"storage_key" varchar(512) NOT NULL,
	"mime_type" varchar(100) NOT NULL,
	"width" integer NOT NULL,
	"height" integer NOT NULL,
	"caption" varchar(500),
	"alt_text" varchar(500),
	"is_decorative" boolean DEFAULT false NOT NULL,
	"display_order" integer DEFAULT 0 NOT NULL,
	"status" "media_status" DEFAULT 'draft' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "media_width_check" CHECK ("media"."width" > 0),
	CONSTRAINT "media_height_check" CHECK ("media"."height" > 0),
	CONSTRAINT "media_display_order_check" CHECK ("media"."display_order" >= 0),
	CONSTRAINT "media_alt_text_check" CHECK ("media"."is_decorative" or ("media"."alt_text" is not null and char_length(trim("media"."alt_text")) > 0))
);
--> statement-breakpoint
CREATE TABLE "place_change_proposals" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"place_id" uuid NOT NULL,
	"proposed_by_user_id" text,
	"status" "proposal_status" DEFAULT 'draft' NOT NULL,
	"proposed_values" jsonb NOT NULL,
	"submitter_notes" text,
	"decision_reason" text,
	"decided_by_user_id" text,
	"submitted_at" timestamp with time zone,
	"decided_at" timestamp with time zone,
	"withdrawn_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "place_change_proposals_notes_length_check" CHECK ("place_change_proposals"."submitter_notes" is null or char_length("place_change_proposals"."submitter_notes") <= 5000),
	CONSTRAINT "place_change_proposals_reason_length_check" CHECK ("place_change_proposals"."decision_reason" is null or char_length("place_change_proposals"."decision_reason") <= 2000)
);
--> statement-breakpoint
CREATE TABLE "place_links" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"place_id" uuid NOT NULL,
	"type" "place_link_type" NOT NULL,
	"url" varchar(2048) NOT NULL,
	"label" varchar(80),
	"display_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "place_links_url_check" CHECK ("place_links"."url" ~ '^https://'),
	CONSTRAINT "place_links_display_order_check" CHECK ("place_links"."display_order" >= 0)
);
--> statement-breakpoint
CREATE TABLE "place_submission_provenance" (
	"place_id" uuid PRIMARY KEY NOT NULL,
	"submitter_user_id" text,
	"source_type" "recommendation_source_type",
	"source_name" varchar(160),
	"source_url" varchar(2048),
	"recommended_on" date,
	"submission_notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "place_submission_provenance_url_check" CHECK ("place_submission_provenance"."source_url" is null or "place_submission_provenance"."source_url" ~ '^https://'),
	CONSTRAINT "place_submission_provenance_notes_length_check" CHECK ("place_submission_provenance"."submission_notes" is null or char_length("place_submission_provenance"."submission_notes") <= 5000)
);
--> statement-breakpoint
CREATE TABLE "places" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(160),
	"slug" varchar(180),
	"city_id" uuid,
	"category_id" uuid,
	"short_summary" varchar(500),
	"description" text,
	"type_label" varchar(120),
	"street_address" varchar(200),
	"address_line_2" varchar(120),
	"postal_code" varchar(32),
	"latitude" numeric(9, 6),
	"longitude" numeric(10, 6),
	"phone" varchar(50),
	"public_attribution_label" varchar(160),
	"public_attribution_url" varchar(2048),
	"status" "place_status" DEFAULT 'draft' NOT NULL,
	"submitted_by_user_id" text,
	"created_by_user_id" text,
	"updated_by_user_id" text,
	"published_by_user_id" text,
	"moderated_by_user_id" text,
	"submitted_at" timestamp with time zone,
	"published_at" timestamp with time zone,
	"moderated_at" timestamp with time zone,
	"archived_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "places_non_draft_identity_check" CHECK ("places"."status" = 'draft' or ("places"."name" is not null and char_length(trim("places"."name")) between 1 and 160 and "places"."city_id" is not null and "places"."category_id" is not null)),
	CONSTRAINT "places_public_slug_check" CHECK ("places"."status" not in ('published', 'unpublished', 'archived') or "places"."slug" is not null),
	CONSTRAINT "places_description_length_check" CHECK ("places"."description" is null or char_length("places"."description") <= 5000),
	CONSTRAINT "places_coordinate_pair_check" CHECK (("places"."latitude" is null and "places"."longitude" is null) or ("places"."latitude" is not null and "places"."longitude" is not null)),
	CONSTRAINT "places_latitude_check" CHECK ("places"."latitude" is null or "places"."latitude" between -90 and 90),
	CONSTRAINT "places_longitude_check" CHECK ("places"."longitude" is null or "places"."longitude" between -180 and 180),
	CONSTRAINT "places_public_attribution_url_check" CHECK ("places"."public_attribution_url" is null or "places"."public_attribution_url" ~ '^https://')
);
--> statement-breakpoint
CREATE TABLE "review_ratings" (
	"review_id" uuid NOT NULL,
	"rating_dimension_id" uuid NOT NULL,
	"rating" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "review_ratings_pk" PRIMARY KEY("review_id","rating_dimension_id"),
	CONSTRAINT "review_ratings_value_check" CHECK ("review_ratings"."rating" between 1 and 5)
);
--> statement-breakpoint
CREATE TABLE "reviews" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"place_id" uuid NOT NULL,
	"overall_rating" integer NOT NULL,
	"text" text,
	"moderation_status" "review_moderation_status" DEFAULT 'visible' NOT NULL,
	"moderated_by_user_id" text,
	"moderation_reason" text,
	"moderated_at" timestamp with time zone,
	"author_deleted_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "reviews_overall_rating_check" CHECK ("reviews"."overall_rating" between 1 and 5),
	CONSTRAINT "reviews_text_length_check" CHECK ("reviews"."text" is null or char_length("reviews"."text") <= 5000),
	CONSTRAINT "reviews_moderation_reason_length_check" CHECK ("reviews"."moderation_reason" is null or char_length("reviews"."moderation_reason") <= 2000)
);
--> statement-breakpoint
CREATE TABLE "visit_ratings" (
	"visit_id" uuid NOT NULL,
	"rating_dimension_id" uuid NOT NULL,
	"rating" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "visit_ratings_pk" PRIMARY KEY("visit_id","rating_dimension_id"),
	CONSTRAINT "visit_ratings_value_check" CHECK ("visit_ratings"."rating" between 1 and 5)
);
--> statement-breakpoint
CREATE TABLE "visits" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"place_id" uuid NOT NULL,
	"visited_on" date NOT NULL,
	"overall_rating" integer NOT NULL,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "visits_overall_rating_check" CHECK ("visits"."overall_rating" between 1 and 5),
	CONSTRAINT "visits_notes_length_check" CHECK ("visits"."notes" is null or char_length("visits"."notes") <= 5000)
);
--> statement-breakpoint
CREATE TABLE "categories" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(80) NOT NULL,
	"slug" varchar(100) NOT NULL,
	"description" varchar(500),
	"display_order" integer DEFAULT 0 NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "categories_display_order_check" CHECK ("categories"."display_order" >= 0)
);
--> statement-breakpoint
CREATE TABLE "category_rating_capabilities" (
	"category_id" uuid NOT NULL,
	"rating_dimension_id" uuid NOT NULL,
	"enabled" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "category_rating_capabilities_pk" PRIMARY KEY("category_id","rating_dimension_id")
);
--> statement-breakpoint
CREATE TABLE "cities" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(160) NOT NULL,
	"region" varchar(160),
	"country" varchar(120) NOT NULL,
	"country_code" varchar(2),
	"slug" varchar(180) NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "cities_country_code_check" CHECK ("cities"."country_code" is null or "cities"."country_code" ~ '^[A-Z]{2}$')
);
--> statement-breakpoint
CREATE TABLE "rating_dimensions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"key" varchar(50) NOT NULL,
	"name" varchar(80) NOT NULL,
	"description" varchar(500),
	"display_order" integer DEFAULT 0 NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "rating_dimensions_display_order_check" CHECK ("rating_dimensions"."display_order" >= 0)
);
--> statement-breakpoint
ALTER TABLE "account" ADD CONSTRAINT "account_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "session" ADD CONSTRAINT "session_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "account_setup_tokens" ADD CONSTRAINT "account_setup_tokens_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "account_setup_tokens" ADD CONSTRAINT "account_setup_tokens_created_by_user_id_user_id_fk" FOREIGN KEY ("created_by_user_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "audit_events" ADD CONSTRAINT "audit_events_actor_user_id_user_id_fk" FOREIGN KEY ("actor_user_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "media" ADD CONSTRAINT "media_place_id_places_id_fk" FOREIGN KEY ("place_id") REFERENCES "public"."places"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "media" ADD CONSTRAINT "media_proposal_id_place_change_proposals_id_fk" FOREIGN KEY ("proposal_id") REFERENCES "public"."place_change_proposals"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "media" ADD CONSTRAINT "media_uploaded_by_user_id_user_id_fk" FOREIGN KEY ("uploaded_by_user_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "place_change_proposals" ADD CONSTRAINT "place_change_proposals_place_id_places_id_fk" FOREIGN KEY ("place_id") REFERENCES "public"."places"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "place_change_proposals" ADD CONSTRAINT "place_change_proposals_proposed_by_user_id_user_id_fk" FOREIGN KEY ("proposed_by_user_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "place_change_proposals" ADD CONSTRAINT "place_change_proposals_decided_by_user_id_user_id_fk" FOREIGN KEY ("decided_by_user_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "place_links" ADD CONSTRAINT "place_links_place_id_places_id_fk" FOREIGN KEY ("place_id") REFERENCES "public"."places"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "place_submission_provenance" ADD CONSTRAINT "place_submission_provenance_place_id_places_id_fk" FOREIGN KEY ("place_id") REFERENCES "public"."places"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "place_submission_provenance" ADD CONSTRAINT "place_submission_provenance_submitter_user_id_user_id_fk" FOREIGN KEY ("submitter_user_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "places" ADD CONSTRAINT "places_city_id_cities_id_fk" FOREIGN KEY ("city_id") REFERENCES "public"."cities"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "places" ADD CONSTRAINT "places_category_id_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."categories"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "places" ADD CONSTRAINT "places_submitted_by_user_id_user_id_fk" FOREIGN KEY ("submitted_by_user_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "places" ADD CONSTRAINT "places_created_by_user_id_user_id_fk" FOREIGN KEY ("created_by_user_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "places" ADD CONSTRAINT "places_updated_by_user_id_user_id_fk" FOREIGN KEY ("updated_by_user_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "places" ADD CONSTRAINT "places_published_by_user_id_user_id_fk" FOREIGN KEY ("published_by_user_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "places" ADD CONSTRAINT "places_moderated_by_user_id_user_id_fk" FOREIGN KEY ("moderated_by_user_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "review_ratings" ADD CONSTRAINT "review_ratings_review_id_reviews_id_fk" FOREIGN KEY ("review_id") REFERENCES "public"."reviews"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "review_ratings" ADD CONSTRAINT "review_ratings_rating_dimension_id_rating_dimensions_id_fk" FOREIGN KEY ("rating_dimension_id") REFERENCES "public"."rating_dimensions"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reviews" ADD CONSTRAINT "reviews_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reviews" ADD CONSTRAINT "reviews_place_id_places_id_fk" FOREIGN KEY ("place_id") REFERENCES "public"."places"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reviews" ADD CONSTRAINT "reviews_moderated_by_user_id_user_id_fk" FOREIGN KEY ("moderated_by_user_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "visit_ratings" ADD CONSTRAINT "visit_ratings_visit_id_visits_id_fk" FOREIGN KEY ("visit_id") REFERENCES "public"."visits"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "visit_ratings" ADD CONSTRAINT "visit_ratings_rating_dimension_id_rating_dimensions_id_fk" FOREIGN KEY ("rating_dimension_id") REFERENCES "public"."rating_dimensions"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "visits" ADD CONSTRAINT "visits_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "visits" ADD CONSTRAINT "visits_place_id_places_id_fk" FOREIGN KEY ("place_id") REFERENCES "public"."places"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "category_rating_capabilities" ADD CONSTRAINT "category_rating_capabilities_category_id_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."categories"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "category_rating_capabilities" ADD CONSTRAINT "category_rating_capability_dimension_fk" FOREIGN KEY ("rating_dimension_id") REFERENCES "public"."rating_dimensions"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "account_provider_account_unique" ON "account" USING btree ("provider_id","account_id");--> statement-breakpoint
CREATE INDEX "account_user_id_idx" ON "account" USING btree ("user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "session_token_unique" ON "session" USING btree ("token");--> statement-breakpoint
CREATE INDEX "session_user_id_idx" ON "session" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "session_expires_at_idx" ON "session" USING btree ("expires_at");--> statement-breakpoint
CREATE UNIQUE INDEX "user_email_unique" ON "user" USING btree (lower("email"));--> statement-breakpoint
CREATE INDEX "user_role_banned_idx" ON "user" USING btree ("role","banned");--> statement-breakpoint
CREATE INDEX "verification_identifier_idx" ON "verification" USING btree ("identifier");--> statement-breakpoint
CREATE INDEX "verification_expires_at_idx" ON "verification" USING btree ("expires_at");--> statement-breakpoint
CREATE UNIQUE INDEX "account_setup_tokens_hash_unique" ON "account_setup_tokens" USING btree ("token_hash");--> statement-breakpoint
CREATE UNIQUE INDEX "account_setup_tokens_one_active_per_user_unique" ON "account_setup_tokens" USING btree ("user_id") WHERE "account_setup_tokens"."consumed_at" is null and "account_setup_tokens"."revoked_at" is null;--> statement-breakpoint
CREATE INDEX "account_setup_tokens_expiry_idx" ON "account_setup_tokens" USING btree ("expires_at");--> statement-breakpoint
CREATE INDEX "audit_events_created_at_idx" ON "audit_events" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "audit_events_actor_idx" ON "audit_events" USING btree ("actor_user_id","created_at");--> statement-breakpoint
CREATE INDEX "audit_events_target_idx" ON "audit_events" USING btree ("target_type","target_id","created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "media_storage_key_unique" ON "media" USING btree ("storage_key");--> statement-breakpoint
CREATE INDEX "media_place_status_order_idx" ON "media" USING btree ("place_id","status","display_order");--> statement-breakpoint
CREATE INDEX "media_proposal_idx" ON "media" USING btree ("proposal_id");--> statement-breakpoint
CREATE INDEX "place_change_proposals_owner_idx" ON "place_change_proposals" USING btree ("proposed_by_user_id","status");--> statement-breakpoint
CREATE INDEX "place_change_proposals_queue_idx" ON "place_change_proposals" USING btree ("status","submitted_at");--> statement-breakpoint
CREATE INDEX "place_change_proposals_place_idx" ON "place_change_proposals" USING btree ("place_id","created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "place_links_identity_unique" ON "place_links" USING btree ("place_id","type",lower(coalesce("label", '')));--> statement-breakpoint
CREATE INDEX "place_links_order_idx" ON "place_links" USING btree ("place_id","display_order");--> statement-breakpoint
CREATE INDEX "place_submission_provenance_submitter_idx" ON "place_submission_provenance" USING btree ("submitter_user_id");--> statement-breakpoint
CREATE INDEX "places_slug_idx" ON "places" USING btree ("slug");--> statement-breakpoint
CREATE INDEX "places_public_browse_idx" ON "places" USING btree ("status","city_id","category_id");--> statement-breakpoint
CREATE INDEX "places_city_name_idx" ON "places" USING btree ("city_id","name");--> statement-breakpoint
CREATE INDEX "places_category_name_idx" ON "places" USING btree ("category_id","name");--> statement-breakpoint
CREATE INDEX "places_submitter_status_idx" ON "places" USING btree ("submitted_by_user_id","status");--> statement-breakpoint
CREATE INDEX "places_moderation_queue_idx" ON "places" USING btree ("status","submitted_at");--> statement-breakpoint
CREATE INDEX "review_ratings_dimension_idx" ON "review_ratings" USING btree ("rating_dimension_id");--> statement-breakpoint
CREATE UNIQUE INDEX "reviews_user_place_unique" ON "reviews" USING btree ("user_id","place_id");--> statement-breakpoint
CREATE INDEX "reviews_public_place_idx" ON "reviews" USING btree ("place_id","moderation_status","author_deleted_at");--> statement-breakpoint
CREATE INDEX "reviews_user_updated_idx" ON "reviews" USING btree ("user_id","updated_at");--> statement-breakpoint
CREATE INDEX "reviews_moderation_queue_idx" ON "reviews" USING btree ("moderation_status","updated_at");--> statement-breakpoint
CREATE INDEX "visit_ratings_dimension_idx" ON "visit_ratings" USING btree ("rating_dimension_id");--> statement-breakpoint
CREATE INDEX "visits_owner_date_idx" ON "visits" USING btree ("user_id","visited_on");--> statement-breakpoint
CREATE INDEX "visits_owner_place_date_idx" ON "visits" USING btree ("user_id","place_id","visited_on");--> statement-breakpoint
CREATE UNIQUE INDEX "categories_name_unique" ON "categories" USING btree (lower("name"));--> statement-breakpoint
CREATE UNIQUE INDEX "categories_slug_unique" ON "categories" USING btree ("slug");--> statement-breakpoint
CREATE INDEX "categories_active_order_idx" ON "categories" USING btree ("is_active","display_order");--> statement-breakpoint
CREATE INDEX "category_rating_capabilities_enabled_idx" ON "category_rating_capabilities" USING btree ("category_id","enabled");--> statement-breakpoint
CREATE UNIQUE INDEX "cities_slug_unique" ON "cities" USING btree ("slug");--> statement-breakpoint
CREATE UNIQUE INDEX "cities_natural_key_unique" ON "cities" USING btree (lower("name"),lower(coalesce("region", '')),lower("country"));--> statement-breakpoint
CREATE INDEX "cities_active_name_idx" ON "cities" USING btree ("is_active","name");--> statement-breakpoint
CREATE UNIQUE INDEX "rating_dimensions_key_unique" ON "rating_dimensions" USING btree ("key");--> statement-breakpoint
CREATE UNIQUE INDEX "rating_dimensions_name_unique" ON "rating_dimensions" USING btree (lower("name"));--> statement-breakpoint
CREATE INDEX "rating_dimensions_active_order_idx" ON "rating_dimensions" USING btree ("is_active","display_order");
--> statement-breakpoint
CREATE EXTENSION IF NOT EXISTS pg_trgm;
--> statement-breakpoint
CREATE INDEX "places_public_text_search_idx" ON "places" USING gin ((coalesce("name", '') || ' ' || coalesce("short_summary", '') || ' ' || coalesce("description", '') || ' ' || coalesce("type_label", '')) gin_trgm_ops) WHERE "status" = 'published';
--> statement-breakpoint
CREATE INDEX "cities_name_search_idx" ON "cities" USING gin ("name" gin_trgm_ops);
--> statement-breakpoint
CREATE INDEX "categories_name_search_idx" ON "categories" USING gin ("name" gin_trgm_ops);
--> statement-breakpoint
CREATE FUNCTION "enforce_rating_dimension_capability"() RETURNS trigger AS $$
DECLARE
  target_category_id uuid;
BEGIN
  IF TG_TABLE_NAME = 'review_ratings' THEN
    SELECT p.category_id
      INTO target_category_id
      FROM reviews r
      JOIN places p ON p.id = r.place_id
     WHERE r.id = NEW.review_id;
  ELSIF TG_TABLE_NAME = 'visit_ratings' THEN
    SELECT p.category_id
      INTO target_category_id
      FROM visits v
      JOIN places p ON p.id = v.place_id
     WHERE v.id = NEW.visit_id;
  ELSE
    RAISE EXCEPTION 'unsupported rating table: %', TG_TABLE_NAME;
  END IF;

  IF NOT EXISTS (
    SELECT 1
      FROM category_rating_capabilities capability
      JOIN rating_dimensions dimension
        ON dimension.id = capability.rating_dimension_id
     WHERE capability.category_id = target_category_id
       AND capability.rating_dimension_id = NEW.rating_dimension_id
       AND capability.enabled
       AND dimension.is_active
  ) THEN
    RAISE EXCEPTION USING
      ERRCODE = '23514',
      MESSAGE = 'rating dimension is not enabled for the place category';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
--> statement-breakpoint
CREATE TRIGGER "review_ratings_capability_trigger"
  BEFORE INSERT OR UPDATE
  ON "review_ratings"
  FOR EACH ROW EXECUTE FUNCTION "enforce_rating_dimension_capability"();
--> statement-breakpoint
CREATE TRIGGER "visit_ratings_capability_trigger"
  BEFORE INSERT OR UPDATE
  ON "visit_ratings"
  FOR EACH ROW EXECUTE FUNCTION "enforce_rating_dimension_capability"();
--> statement-breakpoint
CREATE FUNCTION "enforce_published_place_reference"() RETURNS trigger AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM places
     WHERE id = NEW.place_id
       AND status = 'published'
  ) THEN
    RAISE EXCEPTION USING
      ERRCODE = '23514',
      MESSAGE = TG_TABLE_NAME || ' require a published place';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
--> statement-breakpoint
CREATE TRIGGER "reviews_published_place_trigger"
  BEFORE INSERT OR UPDATE OF "place_id"
  ON "reviews"
  FOR EACH ROW EXECUTE FUNCTION "enforce_published_place_reference"();
--> statement-breakpoint
CREATE TRIGGER "proposals_published_place_trigger"
  BEFORE INSERT OR UPDATE OF "place_id"
  ON "place_change_proposals"
  FOR EACH ROW EXECUTE FUNCTION "enforce_published_place_reference"();
--> statement-breakpoint
CREATE FUNCTION "enforce_media_proposal_place"() RETURNS trigger AS $$
BEGIN
  IF NEW.proposal_id IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM place_change_proposals
     WHERE id = NEW.proposal_id
       AND place_id = NEW.place_id
  ) THEN
    RAISE EXCEPTION USING
      ERRCODE = '23514',
      MESSAGE = 'media place must match its proposal place';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
--> statement-breakpoint
CREATE TRIGGER "media_proposal_place_trigger"
  BEFORE INSERT OR UPDATE OF "place_id", "proposal_id"
  ON "media"
  FOR EACH ROW EXECUTE FUNCTION "enforce_media_proposal_place"();
--> statement-breakpoint
INSERT INTO "rating_dimensions" ("id", "key", "name", "description", "display_order") VALUES
  ('00000000-0000-4000-8000-000000000101', 'food', 'Food', 'Food and beverage quality.', 10),
  ('00000000-0000-4000-8000-000000000102', 'atmosphere', 'Atmosphere', 'Ambience and overall setting.', 20),
  ('00000000-0000-4000-8000-000000000103', 'service', 'Service', 'Quality and attentiveness of service.', 30);
--> statement-breakpoint
INSERT INTO "categories" ("id", "name", "slug", "description", "display_order") VALUES
  ('00000000-0000-4000-8000-000000000201', 'Restaurant', 'restaurants', 'Restaurants, cafés, and other food-focused places.', 10),
  ('00000000-0000-4000-8000-000000000202', 'Bar', 'bars', 'Bars, pubs, wine bars, and cocktail destinations.', 20),
  ('00000000-0000-4000-8000-000000000203', 'Hotel', 'hotels', 'Hotels, inns, and other overnight stays.', 30),
  ('00000000-0000-4000-8000-000000000204', 'Shop', 'shops', 'Independent shops, markets, and retail destinations.', 40),
  ('00000000-0000-4000-8000-000000000205', 'Arts & Culture', 'arts-culture', 'Museums, galleries, performance venues, and cultural institutions.', 50),
  ('00000000-0000-4000-8000-000000000206', 'Attraction', 'attractions', 'Landmarks, parks, and other places of interest.', 60);
--> statement-breakpoint
INSERT INTO "category_rating_capabilities" ("category_id", "rating_dimension_id") VALUES
  ('00000000-0000-4000-8000-000000000201', '00000000-0000-4000-8000-000000000101'),
  ('00000000-0000-4000-8000-000000000201', '00000000-0000-4000-8000-000000000102'),
  ('00000000-0000-4000-8000-000000000201', '00000000-0000-4000-8000-000000000103'),
  ('00000000-0000-4000-8000-000000000202', '00000000-0000-4000-8000-000000000102'),
  ('00000000-0000-4000-8000-000000000202', '00000000-0000-4000-8000-000000000103'),
  ('00000000-0000-4000-8000-000000000203', '00000000-0000-4000-8000-000000000103');

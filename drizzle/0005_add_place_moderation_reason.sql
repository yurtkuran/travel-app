ALTER TABLE "places" ADD COLUMN "moderation_reason" text;
--> statement-breakpoint
ALTER TABLE "places" ADD CONSTRAINT "places_moderation_reason_length_check" CHECK ("places"."moderation_reason" is null or char_length("places"."moderation_reason") <= 2000);

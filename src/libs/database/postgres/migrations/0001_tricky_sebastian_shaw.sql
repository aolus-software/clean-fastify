-- Reset tokens issued before this migration have no expiry and are valid forever; revoking them is
-- the point of the change, and it lets expired_at be added NOT NULL without a backfill default.
-- Rows written before users.status/created_at/updated_at became NOT NULL are backfilled first.
-- users_email_unique_live fails if two live users already share an email; resolve those rows first.
DELETE FROM "password_reset_tokens";--> statement-breakpoint
UPDATE "users" SET "status" = 'active' WHERE "status" IS NULL;--> statement-breakpoint
UPDATE "users" SET "created_at" = now() WHERE "created_at" IS NULL;--> statement-breakpoint
UPDATE "users" SET "updated_at" = now() WHERE "updated_at" IS NULL;--> statement-breakpoint
ALTER TABLE "email_verifications" DROP CONSTRAINT "email_verifications_user_id_users_id_fk";
--> statement-breakpoint
ALTER TABLE "password_reset_tokens" DROP CONSTRAINT "password_reset_tokens_user_id_users_id_fk";
--> statement-breakpoint
DROP INDEX "email_verification_token_index";--> statement-breakpoint
DROP INDEX "password_reset_token_token_index";--> statement-breakpoint
ALTER TABLE "users" ALTER COLUMN "status" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "users" ALTER COLUMN "created_at" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "users" ALTER COLUMN "updated_at" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "email_verifications" ADD COLUMN "used_at" timestamp;--> statement-breakpoint
ALTER TABLE "password_reset_tokens" ADD COLUMN "expired_at" timestamp NOT NULL;--> statement-breakpoint
ALTER TABLE "password_reset_tokens" ADD COLUMN "used_at" timestamp;--> statement-breakpoint
ALTER TABLE "email_verifications" ADD CONSTRAINT "email_verifications_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "password_reset_tokens" ADD CONSTRAINT "password_reset_tokens_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "email_verification_token_unique" ON "email_verifications" USING btree ("token");--> statement-breakpoint
CREATE INDEX "email_verification_user_id_used_at_index" ON "email_verifications" USING btree ("user_id","used_at");--> statement-breakpoint
CREATE UNIQUE INDEX "password_reset_token_token_unique" ON "password_reset_tokens" USING btree ("token");--> statement-breakpoint
CREATE INDEX "password_reset_token_user_id_used_at_index" ON "password_reset_tokens" USING btree ("user_id","used_at");--> statement-breakpoint
CREATE UNIQUE INDEX "users_email_unique_live" ON "users" USING btree ("email") WHERE "users"."deleted_at" IS NULL;
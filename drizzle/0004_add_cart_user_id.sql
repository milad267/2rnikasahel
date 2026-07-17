ALTER TABLE "carts" ADD COLUMN "user_id" integer REFERENCES "users"("id") ON DELETE SET NULL;
--> statement-breakpoint
CREATE INDEX "carts_user_id_idx" ON "carts" ("user_id");

CREATE TABLE "instagram_accounts" (
	"id" serial PRIMARY KEY NOT NULL,
	"username" varchar(200) NOT NULL,
	"password" text NOT NULL,
	"is_active" boolean DEFAULT false NOT NULL,
	"proxy_address" varchar(500),
	"proxy_port" varchar(20),
	"proxy_username" varchar(200),
	"proxy_password" text,
	"login_status" varchar(40) DEFAULT 'not_connected' NOT NULL,
	"last_login_at" timestamp with time zone,
	"cookie_data" text,
	"error_message" text,
	"follower_count" integer DEFAULT 0 NOT NULL,
	"following_count" integer DEFAULT 0 NOT NULL,
	"media_count" integer DEFAULT 0 NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "instagram_conversations" (
	"id" serial PRIMARY KEY NOT NULL,
	"account_id" integer NOT NULL,
	"sender_id" varchar(100) NOT NULL,
	"sender_username" varchar(200),
	"message" text NOT NULL,
	"direction" varchar(30) DEFAULT 'received' NOT NULL,
	"replied_with_rule" integer,
	"replied_post_id" integer,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "instagram_dm_rules" (
	"id" serial PRIMARY KEY NOT NULL,
	"account_id" integer NOT NULL,
	"trigger_keywords" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"response_type" varchar(30) DEFAULT 'text' NOT NULL,
	"response_text" text,
	"ai_prompt" text,
	"is_active" boolean DEFAULT true NOT NULL,
	"priority" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "instagram_posts" (
	"id" serial PRIMARY KEY NOT NULL,
	"account_id" integer NOT NULL,
	"product_id" integer,
	"media_type" varchar(30) DEFAULT 'image' NOT NULL,
	"caption" text,
	"hashtags" text,
	"media_paths" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"instagram_post_id" varchar(100),
	"instagram_permalink" varchar(500),
	"status" varchar(30) DEFAULT 'draft' NOT NULL,
	"scheduled_at" timestamp with time zone,
	"published_at" timestamp with time zone,
	"like_count" integer DEFAULT 0 NOT NULL,
	"comment_count" integer DEFAULT 0 NOT NULL,
	"ai_generated" boolean DEFAULT false NOT NULL,
	"ai_prompt" text,
	"error_message" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "instagram_conversations" ADD CONSTRAINT "instagram_conversations_account_id_instagram_accounts_id_fk" FOREIGN KEY ("account_id") REFERENCES "public"."instagram_accounts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "instagram_dm_rules" ADD CONSTRAINT "instagram_dm_rules_account_id_instagram_accounts_id_fk" FOREIGN KEY ("account_id") REFERENCES "public"."instagram_accounts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "instagram_posts" ADD CONSTRAINT "instagram_posts_account_id_instagram_accounts_id_fk" FOREIGN KEY ("account_id") REFERENCES "public"."instagram_accounts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "instagram_posts" ADD CONSTRAINT "instagram_posts_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "instagram_conversations_account_idx" ON "instagram_conversations" USING btree ("account_id");--> statement-breakpoint
CREATE INDEX "instagram_conversations_sender_idx" ON "instagram_conversations" USING btree ("sender_id");--> statement-breakpoint
CREATE INDEX "instagram_dm_rules_account_idx" ON "instagram_dm_rules" USING btree ("account_id");--> statement-breakpoint
CREATE INDEX "instagram_posts_account_idx" ON "instagram_posts" USING btree ("account_id");--> statement-breakpoint
CREATE INDEX "instagram_posts_status_idx" ON "instagram_posts" USING btree ("status");--> statement-breakpoint
CREATE INDEX "instagram_posts_scheduled_idx" ON "instagram_posts" USING btree ("scheduled_at");
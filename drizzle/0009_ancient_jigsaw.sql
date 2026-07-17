ALTER TABLE "instagram_accounts" ADD COLUMN "proxy_type" varchar(20) DEFAULT 'v2ray' NOT NULL;--> statement-breakpoint
ALTER TABLE "instagram_accounts" ADD COLUMN "proxy_config" jsonb DEFAULT '{}'::jsonb;--> statement-breakpoint
ALTER TABLE "instagram_accounts" ADD COLUMN "use_proxy" boolean DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE "instagram_accounts" ADD COLUMN "vpn_status" varchar(30) DEFAULT 'unknown' NOT NULL;--> statement-breakpoint
ALTER TABLE "instagram_accounts" ADD COLUMN "last_ping_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "instagram_accounts" ADD COLUMN "vpn_alert_enabled" boolean DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE "instagram_accounts" ADD COLUMN "two_factor_enabled" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "instagram_accounts" ADD COLUMN "two_factor_method" varchar(10) DEFAULT 'app';--> statement-breakpoint
ALTER TABLE "instagram_accounts" ADD COLUMN "two_factor_secret" text;
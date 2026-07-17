ALTER TABLE "instagram_accounts" ADD COLUMN "v2ray_link" text;--> statement-breakpoint
ALTER TABLE "instagram_accounts" DROP COLUMN "proxy_address";--> statement-breakpoint
ALTER TABLE "instagram_accounts" DROP COLUMN "proxy_port";--> statement-breakpoint
ALTER TABLE "instagram_accounts" DROP COLUMN "proxy_username";--> statement-breakpoint
ALTER TABLE "instagram_accounts" DROP COLUMN "proxy_password";
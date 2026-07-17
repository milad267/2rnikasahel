CREATE TABLE "order_tracking" (
	"id" serial PRIMARY KEY NOT NULL,
	"order_id" integer NOT NULL,
	"status" varchar(60) NOT NULL,
	"title" varchar(300) NOT NULL,
	"description" text,
	"tracking_code" varchar(200),
	"estimated_delivery" timestamp with time zone,
	"location" varchar(200),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "shipping_methods" (
	"id" serial PRIMARY KEY NOT NULL,
	"title" varchar(200) NOT NULL,
	"description" text,
	"cost" numeric(14, 0) DEFAULT '0' NOT NULL,
	"free_threshold" numeric(14, 0) DEFAULT '0' NOT NULL,
	"delivery_days" varchar(100),
	"is_free" boolean DEFAULT false NOT NULL,
	"logo" varchar(50),
	"tracking_base_url" varchar(500),
	"sort_order" integer DEFAULT 0 NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "carts" ADD COLUMN "user_id" integer;--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "shipping_cost" numeric(14, 0) DEFAULT '0' NOT NULL;--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "province" varchar(100) DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "city" varchar(100) DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "postal_code" varchar(20);--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "receiver_name" varchar(160);--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "receiver_phone" varchar(30);--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "shipping_method_id" integer;--> statement-breakpoint
ALTER TABLE "product_variants" ADD COLUMN "has_discount" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "product_variants" ADD COLUMN "discount_type" varchar(10) DEFAULT 'percent';--> statement-breakpoint
ALTER TABLE "product_variants" ADD COLUMN "discount_value" numeric(14, 0) DEFAULT '0';--> statement-breakpoint
ALTER TABLE "product_variants" ADD COLUMN "discount_price" numeric(14, 0) DEFAULT '0';--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "failed_login_attempts" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "locked_until" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "last_login_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "order_tracking" ADD CONSTRAINT "order_tracking_order_id_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "order_tracking_order_idx" ON "order_tracking" USING btree ("order_id");--> statement-breakpoint
ALTER TABLE "carts" ADD CONSTRAINT "carts_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "carts_user_id_idx" ON "carts" USING btree ("user_id");
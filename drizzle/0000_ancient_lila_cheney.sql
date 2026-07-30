CREATE TYPE "public"."category" AS ENUM('frais', 'sec', 'sucre', 'viande', 'boissons');--> statement-breakpoint
CREATE TYPE "public"."image_media_type" AS ENUM('image/jpeg', 'image/png', 'image/webp', 'image/gif');--> statement-breakpoint
CREATE TYPE "public"."reminder_kind" AS ENUM('daily-sales', 'monthly-inventory');--> statement-breakpoint
CREATE TYPE "public"."role" AS ENUM('manager', 'director', 'waiter');--> statement-breakpoint
CREATE TYPE "public"."site_id" AS ENUM('bdf', 'carouge', 'molard', 'vevey', 'philosophe', 'hoshy');--> statement-breakpoint
CREATE TYPE "public"."zone" AS ENUM('cuisine', 'salle');--> statement-breakpoint
CREATE TABLE "daily_sales_entries" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"site_id" "site_id" NOT NULL,
	"date" text NOT NULL,
	"card_revenue" numeric(12, 2) NOT NULL,
	"net_revenue" numeric(12, 2) NOT NULL,
	"quantities" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"recorded_by_user_id" uuid NOT NULL,
	"recorded_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "daily_sales_site_date_unique" UNIQUE("site_id","date")
);
--> statement-breakpoint
CREATE TABLE "inventory_access_grants" (
	"site_id" "site_id" PRIMARY KEY NOT NULL
);
--> statement-breakpoint
CREATE TABLE "inventory_items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"site_id" "site_id" NOT NULL,
	"name" text NOT NULL,
	"zone" "zone" NOT NULL,
	"unit" text NOT NULL,
	"units_per_package" integer DEFAULT 1 NOT NULL,
	"package_content_label" text,
	"quantity" numeric(12, 3) NOT NULL,
	"unit_price" numeric(12, 2) NOT NULL,
	"supplier_id" uuid,
	"visible_to_manager" boolean DEFAULT true NOT NULL,
	"visible_to_server" boolean DEFAULT false NOT NULL,
	"category" "category" NOT NULL
);
--> statement-breakpoint
CREATE TABLE "menu_items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"site_id" "site_id" NOT NULL,
	"name" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "receipts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"site_id" "site_id" NOT NULL,
	"submitted_by_user_id" uuid NOT NULL,
	"submitted_at" timestamp with time zone DEFAULT now() NOT NULL,
	"image_url" text NOT NULL,
	"image_media_type" "image_media_type" NOT NULL,
	"ai_summary" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "reminder_completions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"site_id" "site_id" NOT NULL,
	"kind" "reminder_kind" NOT NULL,
	"period" text NOT NULL,
	"completed_at" timestamp with time zone DEFAULT now() NOT NULL,
	"completed_by_user_id" uuid NOT NULL,
	CONSTRAINT "reminder_completions_site_kind_period_unique" UNIQUE("site_id","kind","period")
);
--> statement-breakpoint
CREATE TABLE "suppliers" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"role" "role" NOT NULL,
	"site_id" "site_id",
	"password_hash" text NOT NULL
);
--> statement-breakpoint
ALTER TABLE "inventory_items" ADD CONSTRAINT "inventory_items_supplier_id_suppliers_id_fk" FOREIGN KEY ("supplier_id") REFERENCES "public"."suppliers"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "inventory_items_site_id_idx" ON "inventory_items" USING btree ("site_id");--> statement-breakpoint
CREATE INDEX "menu_items_site_id_idx" ON "menu_items" USING btree ("site_id");--> statement-breakpoint
CREATE INDEX "receipts_site_id_idx" ON "receipts" USING btree ("site_id");--> statement-breakpoint
CREATE INDEX "users_site_id_idx" ON "users" USING btree ("site_id");
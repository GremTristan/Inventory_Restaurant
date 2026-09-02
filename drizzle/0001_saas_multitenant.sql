-- Hand-written, data-preserving migration: single-tenant (hard-coded site enum)
-- -> multi-tenant SaaS (tenants + sites tables, uuid foreign keys, orders,
-- recipes, stock movements, audit log, staff PIN vs director password).
-- Every existing row is mapped onto a default tenant; nothing is deleted.

CREATE TYPE "public"."menu_category" AS ENUM('salee', 'sucree', 'boisson', 'autre');--> statement-breakpoint
CREATE TYPE "public"."order_item_status" AS ENUM('pending', 'ready');--> statement-breakpoint
CREATE TYPE "public"."order_kind" AS ENUM('table', 'takeaway');--> statement-breakpoint
CREATE TYPE "public"."order_status" AS ENUM('open', 'sent', 'ready', 'served', 'paid', 'cancelled');--> statement-breakpoint
CREATE TYPE "public"."payment_method" AS ENUM('cash', 'card', 'twint', 'other');--> statement-breakpoint
CREATE TYPE "public"."plan" AS ENUM('essentiel', 'pro');--> statement-breakpoint
CREATE TYPE "public"."stock_movement_reason" AS ENUM('sale', 'count', 'adjust', 'waste', 'import');--> statement-breakpoint
CREATE TYPE "public"."tenant_status" AS ENUM('trial', 'active', 'past_due', 'canceled', 'suspended');--> statement-breakpoint
ALTER TYPE "public"."role" RENAME VALUE 'manager' TO 'cook';--> statement-breakpoint
ALTER TYPE "public"."role" ADD VALUE IF NOT EXISTS 'superadmin';--> statement-breakpoint

CREATE TABLE "tenants" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"slug" text NOT NULL,
	"brand_color" text,
	"logo_url" text,
	"currency" text DEFAULT 'CHF' NOT NULL,
	"status" "tenant_status" DEFAULT 'trial' NOT NULL,
	"plan" "plan" DEFAULT 'essentiel' NOT NULL,
	"trial_ends_at" timestamp with time zone,
	"stripe_customer_id" text,
	"stripe_subscription_id" text,
	"billing_email" text,
	"legal_name" text,
	"legal_address" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "tenants_slug_unique" UNIQUE("slug")
);--> statement-breakpoint
CREATE TABLE "sites" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"name" text NOT NULL,
	"slug" text NOT NULL,
	"device_code" text NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "sites_device_code_unique" UNIQUE("device_code"),
	CONSTRAINT "sites_tenant_slug_unique" UNIQUE("tenant_id","slug")
);--> statement-breakpoint
ALTER TABLE "sites" ADD CONSTRAINT "sites_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "sites_tenant_id_idx" ON "sites" USING btree ("tenant_id");--> statement-breakpoint

-- Default tenant carrying every pre-existing row. Active (not trial): this is
-- the editor's own pilot chain.
INSERT INTO "tenants" ("id", "name", "slug", "status", "plan")
VALUES ('11111111-1111-4111-8111-111111111111', 'Crêperies Group', 'creperies-group', 'active', 'pro');--> statement-breakpoint
INSERT INTO "sites" ("tenant_id", "name", "slug", "device_code")
SELECT '11111111-1111-4111-8111-111111111111', v.name, v.slug, upper(substr(md5('site-' || v.slug), 1, 6))
FROM (VALUES
	('bdf', 'BDF'),
	('carouge', 'Carouge'),
	('molard', 'Molard'),
	('vevey', 'Vevey'),
	('philosophe', 'Philosophe'),
	('hoshy', 'Hoshy')
) AS v(slug, name);--> statement-breakpoint

-- suppliers: tenant scope
ALTER TABLE "suppliers" ADD COLUMN "tenant_id" uuid;--> statement-breakpoint
UPDATE "suppliers" SET "tenant_id" = '11111111-1111-4111-8111-111111111111';--> statement-breakpoint
ALTER TABLE "suppliers" ALTER COLUMN "tenant_id" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "suppliers" ADD CONSTRAINT "suppliers_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "suppliers_tenant_id_idx" ON "suppliers" USING btree ("tenant_id");--> statement-breakpoint

-- inventory_items: enum site_id -> uuid site_id, tenant_id, threshold
ALTER TABLE "inventory_items" ADD COLUMN "site_uuid" uuid;--> statement-breakpoint
UPDATE "inventory_items" i SET "site_uuid" = s."id" FROM "sites" s WHERE s."slug" = i."site_id"::text;--> statement-breakpoint
ALTER TABLE "inventory_items" DROP COLUMN "site_id";--> statement-breakpoint
ALTER TABLE "inventory_items" RENAME COLUMN "site_uuid" TO "site_id";--> statement-breakpoint
ALTER TABLE "inventory_items" ALTER COLUMN "site_id" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "inventory_items" ADD COLUMN "tenant_id" uuid;--> statement-breakpoint
UPDATE "inventory_items" SET "tenant_id" = '11111111-1111-4111-8111-111111111111';--> statement-breakpoint
ALTER TABLE "inventory_items" ALTER COLUMN "tenant_id" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "inventory_items" ADD COLUMN "low_stock_threshold" numeric(12, 3);--> statement-breakpoint
ALTER TABLE "inventory_items" ADD CONSTRAINT "inventory_items_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inventory_items" ADD CONSTRAINT "inventory_items_site_id_sites_id_fk" FOREIGN KEY ("site_id") REFERENCES "public"."sites"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "inventory_items_site_id_idx" ON "inventory_items" USING btree ("site_id");--> statement-breakpoint
CREATE INDEX "inventory_items_tenant_id_idx" ON "inventory_items" USING btree ("tenant_id");--> statement-breakpoint

-- menu_items: enum -> uuid, tenant, price/category/availability
ALTER TABLE "menu_items" ADD COLUMN "site_uuid" uuid;--> statement-breakpoint
UPDATE "menu_items" m SET "site_uuid" = s."id" FROM "sites" s WHERE s."slug" = m."site_id"::text;--> statement-breakpoint
ALTER TABLE "menu_items" DROP COLUMN "site_id";--> statement-breakpoint
ALTER TABLE "menu_items" RENAME COLUMN "site_uuid" TO "site_id";--> statement-breakpoint
ALTER TABLE "menu_items" ALTER COLUMN "site_id" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "menu_items" ADD COLUMN "tenant_id" uuid;--> statement-breakpoint
UPDATE "menu_items" SET "tenant_id" = '11111111-1111-4111-8111-111111111111';--> statement-breakpoint
ALTER TABLE "menu_items" ALTER COLUMN "tenant_id" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "menu_items" ADD COLUMN "price" numeric(12, 2) DEFAULT '0' NOT NULL;--> statement-breakpoint
ALTER TABLE "menu_items" ADD COLUMN "category" "menu_category" DEFAULT 'autre' NOT NULL;--> statement-breakpoint
ALTER TABLE "menu_items" ADD COLUMN "available" boolean DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE "menu_items" ADD COLUMN "sort_order" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "menu_items" ADD CONSTRAINT "menu_items_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "menu_items" ADD CONSTRAINT "menu_items_site_id_sites_id_fk" FOREIGN KEY ("site_id") REFERENCES "public"."sites"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "menu_items_site_id_idx" ON "menu_items" USING btree ("site_id");--> statement-breakpoint
CREATE INDEX "menu_items_tenant_id_idx" ON "menu_items" USING btree ("tenant_id");--> statement-breakpoint

-- daily_sales_entries
ALTER TABLE "daily_sales_entries" DROP CONSTRAINT "daily_sales_site_date_unique";--> statement-breakpoint
ALTER TABLE "daily_sales_entries" ADD COLUMN "site_uuid" uuid;--> statement-breakpoint
UPDATE "daily_sales_entries" d SET "site_uuid" = s."id" FROM "sites" s WHERE s."slug" = d."site_id"::text;--> statement-breakpoint
ALTER TABLE "daily_sales_entries" DROP COLUMN "site_id";--> statement-breakpoint
ALTER TABLE "daily_sales_entries" RENAME COLUMN "site_uuid" TO "site_id";--> statement-breakpoint
ALTER TABLE "daily_sales_entries" ALTER COLUMN "site_id" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "daily_sales_entries" ADD COLUMN "tenant_id" uuid;--> statement-breakpoint
UPDATE "daily_sales_entries" SET "tenant_id" = '11111111-1111-4111-8111-111111111111';--> statement-breakpoint
ALTER TABLE "daily_sales_entries" ALTER COLUMN "tenant_id" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "daily_sales_entries" ADD COLUMN "twint_revenue" numeric(12, 2) DEFAULT '0' NOT NULL;--> statement-breakpoint
ALTER TABLE "daily_sales_entries" ADD CONSTRAINT "daily_sales_site_date_unique" UNIQUE("site_id","date");--> statement-breakpoint
ALTER TABLE "daily_sales_entries" ADD CONSTRAINT "daily_sales_entries_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "daily_sales_entries" ADD CONSTRAINT "daily_sales_entries_site_id_sites_id_fk" FOREIGN KEY ("site_id") REFERENCES "public"."sites"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "daily_sales_tenant_id_idx" ON "daily_sales_entries" USING btree ("tenant_id");--> statement-breakpoint

-- reminder_completions
ALTER TABLE "reminder_completions" DROP CONSTRAINT "reminder_completions_site_kind_period_unique";--> statement-breakpoint
ALTER TABLE "reminder_completions" ADD COLUMN "site_uuid" uuid;--> statement-breakpoint
UPDATE "reminder_completions" r SET "site_uuid" = s."id" FROM "sites" s WHERE s."slug" = r."site_id"::text;--> statement-breakpoint
ALTER TABLE "reminder_completions" DROP COLUMN "site_id";--> statement-breakpoint
ALTER TABLE "reminder_completions" RENAME COLUMN "site_uuid" TO "site_id";--> statement-breakpoint
ALTER TABLE "reminder_completions" ALTER COLUMN "site_id" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "reminder_completions" ADD CONSTRAINT "reminder_completions_site_kind_period_unique" UNIQUE("site_id","kind","period");--> statement-breakpoint
ALTER TABLE "reminder_completions" ADD CONSTRAINT "reminder_completions_site_id_sites_id_fk" FOREIGN KEY ("site_id") REFERENCES "public"."sites"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint

-- receipts
ALTER TABLE "receipts" ADD COLUMN "site_uuid" uuid;--> statement-breakpoint
UPDATE "receipts" r SET "site_uuid" = s."id" FROM "sites" s WHERE s."slug" = r."site_id"::text;--> statement-breakpoint
ALTER TABLE "receipts" DROP COLUMN "site_id";--> statement-breakpoint
ALTER TABLE "receipts" RENAME COLUMN "site_uuid" TO "site_id";--> statement-breakpoint
ALTER TABLE "receipts" ALTER COLUMN "site_id" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "receipts" ADD COLUMN "tenant_id" uuid;--> statement-breakpoint
UPDATE "receipts" SET "tenant_id" = '11111111-1111-4111-8111-111111111111';--> statement-breakpoint
ALTER TABLE "receipts" ALTER COLUMN "tenant_id" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "receipts" ADD CONSTRAINT "receipts_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "receipts" ADD CONSTRAINT "receipts_site_id_sites_id_fk" FOREIGN KEY ("site_id") REFERENCES "public"."sites"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "receipts_site_id_idx" ON "receipts" USING btree ("site_id");--> statement-breakpoint

-- users: staff keep their PIN (moved to pin_hash); directors switch to
-- email + password (bootstrapped by `npm run seed:chain`).
ALTER TABLE "users" ADD COLUMN "site_uuid" uuid;--> statement-breakpoint
UPDATE "users" u SET "site_uuid" = s."id" FROM "sites" s WHERE s."slug" = u."site_id"::text;--> statement-breakpoint
ALTER TABLE "users" DROP COLUMN "site_id";--> statement-breakpoint
ALTER TABLE "users" RENAME COLUMN "site_uuid" TO "site_id";--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "tenant_id" uuid;--> statement-breakpoint
UPDATE "users" SET "tenant_id" = '11111111-1111-4111-8111-111111111111';--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "email" text;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "pin_hash" text;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "active" boolean DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "failed_attempts" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "locked_until" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "created_at" timestamp with time zone DEFAULT now() NOT NULL;--> statement-breakpoint
ALTER TABLE "users" ALTER COLUMN "password_hash" DROP NOT NULL;--> statement-breakpoint
UPDATE "users" SET "pin_hash" = "password_hash", "password_hash" = NULL WHERE "role" IN ('cook', 'waiter');--> statement-breakpoint
UPDATE "users" SET "password_hash" = NULL WHERE "role" = 'director';--> statement-breakpoint
ALTER TABLE "users" ADD CONSTRAINT "users_email_unique" UNIQUE("email");--> statement-breakpoint
ALTER TABLE "users" ADD CONSTRAINT "users_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "users" ADD CONSTRAINT "users_site_id_sites_id_fk" FOREIGN KEY ("site_id") REFERENCES "public"."sites"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "users_site_id_idx" ON "users" USING btree ("site_id");--> statement-breakpoint
CREATE INDEX "users_tenant_id_idx" ON "users" USING btree ("tenant_id");--> statement-breakpoint

-- The director-granted "cook may see stock" gate is gone: stock is the
-- cook's job by role definition.
DROP TABLE "inventory_access_grants";--> statement-breakpoint
DROP TYPE "public"."site_id";--> statement-breakpoint

-- New operational tables
CREATE TABLE "menu_item_ingredients" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"menu_item_id" uuid NOT NULL,
	"inventory_item_id" uuid NOT NULL,
	"quantity" numeric(12, 4) NOT NULL,
	CONSTRAINT "menu_item_ingredients_unique" UNIQUE("menu_item_id","inventory_item_id")
);--> statement-breakpoint
ALTER TABLE "menu_item_ingredients" ADD CONSTRAINT "menu_item_ingredients_menu_item_id_menu_items_id_fk" FOREIGN KEY ("menu_item_id") REFERENCES "public"."menu_items"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "menu_item_ingredients" ADD CONSTRAINT "menu_item_ingredients_inventory_item_id_inventory_items_id_fk" FOREIGN KEY ("inventory_item_id") REFERENCES "public"."inventory_items"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "menu_item_ingredients_menu_item_idx" ON "menu_item_ingredients" USING btree ("menu_item_id");--> statement-breakpoint

CREATE TABLE "orders" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"site_id" uuid NOT NULL,
	"number" integer NOT NULL,
	"service_date" text NOT NULL,
	"kind" "order_kind" NOT NULL,
	"table_label" text,
	"status" "order_status" DEFAULT 'open' NOT NULL,
	"note" text,
	"total" numeric(12, 2) DEFAULT '0' NOT NULL,
	"payment_method" "payment_method",
	"created_by_user_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"sent_at" timestamp with time zone,
	"ready_at" timestamp with time zone,
	"served_at" timestamp with time zone,
	"paid_at" timestamp with time zone,
	"paid_by_user_id" uuid,
	"client_id" text,
	CONSTRAINT "orders_client_id_unique" UNIQUE("site_id","client_id")
);--> statement-breakpoint
ALTER TABLE "orders" ADD CONSTRAINT "orders_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "orders" ADD CONSTRAINT "orders_site_id_sites_id_fk" FOREIGN KEY ("site_id") REFERENCES "public"."sites"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "orders_site_status_idx" ON "orders" USING btree ("site_id","status");--> statement-breakpoint
CREATE INDEX "orders_site_date_idx" ON "orders" USING btree ("site_id","service_date");--> statement-breakpoint
CREATE INDEX "orders_tenant_id_idx" ON "orders" USING btree ("tenant_id");--> statement-breakpoint

CREATE TABLE "order_items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"order_id" uuid NOT NULL,
	"menu_item_id" uuid,
	"name" text NOT NULL,
	"unit_price" numeric(12, 2) NOT NULL,
	"quantity" integer DEFAULT 1 NOT NULL,
	"status" "order_item_status" DEFAULT 'pending' NOT NULL,
	"note" text
);--> statement-breakpoint
ALTER TABLE "order_items" ADD CONSTRAINT "order_items_order_id_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "order_items" ADD CONSTRAINT "order_items_menu_item_id_menu_items_id_fk" FOREIGN KEY ("menu_item_id") REFERENCES "public"."menu_items"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "order_items_order_id_idx" ON "order_items" USING btree ("order_id");--> statement-breakpoint

CREATE TABLE "stock_movements" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"site_id" uuid NOT NULL,
	"inventory_item_id" uuid NOT NULL,
	"delta" numeric(12, 4) NOT NULL,
	"reason" "stock_movement_reason" NOT NULL,
	"order_id" uuid,
	"user_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);--> statement-breakpoint
ALTER TABLE "stock_movements" ADD CONSTRAINT "stock_movements_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "stock_movements" ADD CONSTRAINT "stock_movements_site_id_sites_id_fk" FOREIGN KEY ("site_id") REFERENCES "public"."sites"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "stock_movements" ADD CONSTRAINT "stock_movements_inventory_item_id_inventory_items_id_fk" FOREIGN KEY ("inventory_item_id") REFERENCES "public"."inventory_items"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "stock_movements" ADD CONSTRAINT "stock_movements_order_id_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "stock_movements_item_idx" ON "stock_movements" USING btree ("inventory_item_id");--> statement-breakpoint

CREATE TABLE "audit_logs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid,
	"site_id" uuid,
	"user_id" uuid,
	"action" text NOT NULL,
	"target_type" text,
	"target_id" text,
	"details" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);--> statement-breakpoint
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "audit_logs_tenant_created_idx" ON "audit_logs" USING btree ("tenant_id","created_at");

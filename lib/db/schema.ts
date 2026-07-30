import {
  boolean,
  index,
  integer,
  jsonb,
  numeric,
  pgEnum,
  pgTable,
  text,
  timestamp,
  unique,
  uuid,
} from "drizzle-orm/pg-core";

// Mirrors the string-union types in types/index.ts — kept as Postgres native
// enums so an invalid value is rejected at the DB layer, not just in TS.
export const roleEnum = pgEnum("role", ["manager", "director", "waiter"]);
export const siteIdEnum = pgEnum("site_id", [
  "bdf",
  "carouge",
  "molard",
  "vevey",
  "philosophe",
  "hoshy",
]);
export const categoryEnum = pgEnum("category", ["frais", "sec", "sucre", "viande", "boissons"]);
export const zoneEnum = pgEnum("zone", ["cuisine", "salle"]);
export const imageMediaTypeEnum = pgEnum("image_media_type", [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
]);
export const reminderKindEnum = pgEnum("reminder_kind", ["daily-sales", "monthly-inventory"]);

export const suppliers = pgTable("suppliers", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
});

export const inventoryItems = pgTable(
  "inventory_items",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    siteId: siteIdEnum("site_id").notNull(),
    name: text("name").notNull(),
    zone: zoneEnum("zone").notNull(),
    unit: text("unit").notNull(),
    unitsPerPackage: integer("units_per_package").notNull().default(1),
    packageContentLabel: text("package_content_label"),
    quantity: numeric("quantity", { precision: 12, scale: 3 }).notNull(),
    unitPrice: numeric("unit_price", { precision: 12, scale: 2 }).notNull(),
    supplierId: uuid("supplier_id").references(() => suppliers.id, { onDelete: "set null" }),
    visibleToManager: boolean("visible_to_manager").notNull().default(true),
    visibleToServer: boolean("visible_to_server").notNull().default(false),
    category: categoryEnum("category").notNull(),
  },
  (table) => [index("inventory_items_site_id_idx").on(table.siteId)]
);

export const menuItems = pgTable(
  "menu_items",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    siteId: siteIdEnum("site_id").notNull(),
    name: text("name").notNull(),
  },
  (table) => [index("menu_items_site_id_idx").on(table.siteId)]
);

// One row per (siteId, date) — upserted, never duplicated. See
// recordDailySales in lib/sales-store.ts for the upsert semantics this
// unique constraint backs.
export const dailySalesEntries = pgTable(
  "daily_sales_entries",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    siteId: siteIdEnum("site_id").notNull(),
    date: text("date").notNull(), // "YYYY-MM-DD"
    cardRevenue: numeric("card_revenue", { precision: 12, scale: 2 }).notNull(),
    netRevenue: numeric("net_revenue", { precision: 12, scale: 2 }).notNull(),
    // menuItemId -> quantity. May reference ids for since-deleted menu items;
    // callers skip unknown ids at render time (see types/index.ts).
    quantities: jsonb("quantities").$type<Record<string, number>>().notNull().default({}),
    recordedByUserId: uuid("recorded_by_user_id").notNull(),
    recordedAt: timestamp("recorded_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [unique("daily_sales_site_date_unique").on(table.siteId, table.date)]
);

export const reminderCompletions = pgTable(
  "reminder_completions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    siteId: siteIdEnum("site_id").notNull(),
    kind: reminderKindEnum("kind").notNull(),
    period: text("period").notNull(), // "YYYY-MM-DD" or "YYYY-MM"
    completedAt: timestamp("completed_at", { withTimezone: true }).notNull().defaultNow(),
    completedByUserId: uuid("completed_by_user_id").notNull(),
  },
  (table) => [unique("reminder_completions_site_kind_period_unique").on(table.siteId, table.kind, table.period)]
);

// Sites where the director has granted the manager direct inventory access.
// Presence of a row = granted; absence = not granted (mirrors the old
// inventoryAccessSites: SiteId[] array in sales-config.json).
export const inventoryAccessGrants = pgTable("inventory_access_grants", {
  siteId: siteIdEnum("site_id").primaryKey(),
});

export const users = pgTable(
  "users",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    name: text("name").notNull(),
    role: roleEnum("role").notNull(),
    // Only set for managers/waiters; directors can access every site.
    siteId: siteIdEnum("site_id"),
    passwordHash: text("password_hash").notNull(),
  },
  (table) => [index("users_site_id_idx").on(table.siteId)]
);

export const receipts = pgTable(
  "receipts",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    siteId: siteIdEnum("site_id").notNull(),
    submittedByUserId: uuid("submitted_by_user_id").notNull(),
    submittedAt: timestamp("submitted_at", { withTimezone: true }).notNull().defaultNow(),
    // Full Vercel Blob URL (was a relative data/receipts/... path pre-migration).
    imageUrl: text("image_url").notNull(),
    imageMediaType: imageMediaTypeEnum("image_media_type").notNull(),
    aiSummary: text("ai_summary").notNull(),
  },
  (table) => [index("receipts_site_id_idx").on(table.siteId)]
);

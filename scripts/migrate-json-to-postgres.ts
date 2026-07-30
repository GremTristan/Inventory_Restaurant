import "dotenv/config";
import { config } from "dotenv";
config({ path: ".env.local" });

import fs from "fs";
import path from "path";
import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import { put } from "@vercel/blob";
import * as schema from "../lib/db/schema";

// One-off backfill: reads the legacy data/*.json files + data/receipts/
// images from this repo and inserts them into the new Postgres tables /
// uploads them to Blob. Safe to re-run: each table is checked for existing
// rows and skipped if already populated, so this never double-inserts.
//
// Old JSON ids are not UUIDs (e.g. "bdf-1", "manager-bdf") — Postgres
// columns are uuid, so every row gets a freshly generated UUID here, and
// every cross-reference (supplierId, recordedByUserId, submittedByUserId,
// menuItemId keys inside `quantities`) is remapped through an old-id ->
// new-id table built while inserting the referenced row first.

const sql = neon(process.env.DATABASE_URL!);
const db = drizzle(sql, { schema });

const DATA_DIR = path.join(process.cwd(), "data");

function readJson<T>(file: string): T {
  return JSON.parse(fs.readFileSync(path.join(DATA_DIR, file), "utf-8"));
}

async function migrateUsers() {
  const existing = await db.select().from(schema.users).limit(1);
  if (existing.length > 0) {
    console.log("users: already populated, skipping");
    return new Map<string, string>();
  }

  const { users } = readJson<{
    users: { id: string; name: string; role: string; siteId: string | null; passwordHash: string }[];
  }>("user-config.json");

  const idMap = new Map<string, string>();
  for (const u of users) {
    const [row] = await db
      .insert(schema.users)
      .values({
        name: u.name,
        role: u.role as (typeof schema.users.$inferInsert)["role"],
        siteId: u.siteId as (typeof schema.users.$inferInsert)["siteId"],
        passwordHash: u.passwordHash,
      })
      .returning({ id: schema.users.id });
    idMap.set(u.id, row.id);
  }
  console.log(`users: inserted ${idMap.size}`);
  return idMap;
}

async function migrateSuppliersAndInventory() {
  const existingSuppliers = await db.select().from(schema.suppliers).limit(1);
  const existingInventory = await db.select().from(schema.inventoryItems).limit(1);
  if (existingSuppliers.length > 0 || existingInventory.length > 0) {
    console.log("suppliers/inventory: already populated, skipping");
    return;
  }

  const { suppliers, inventory } = readJson<{
    suppliers: { id: string; name: string }[];
    inventory: Record<string, unknown>[];
  }>("site-config.json");

  const supplierIdMap = new Map<string, string>();
  for (const s of suppliers) {
    const [row] = await db.insert(schema.suppliers).values({ name: s.name }).returning({ id: schema.suppliers.id });
    supplierIdMap.set(s.id, row.id);
  }
  console.log(`suppliers: inserted ${supplierIdMap.size}`);

  let count = 0;
  for (const item of inventory) {
    const oldSupplierId = item.supplierId as string | null;
    await db.insert(schema.inventoryItems).values({
      siteId: item.siteId as (typeof schema.inventoryItems.$inferInsert)["siteId"],
      name: item.name as string,
      zone: (item.zone as (typeof schema.inventoryItems.$inferInsert)["zone"]) ?? "cuisine",
      unit: item.unit as string,
      unitsPerPackage: (item.unitsPerPackage as number) ?? 1,
      packageContentLabel: (item.packageContentLabel as string) ?? null,
      quantity: String(item.quantity),
      unitPrice: String(item.unitPrice),
      supplierId: oldSupplierId ? (supplierIdMap.get(oldSupplierId) ?? null) : null,
      visibleToManager: (item.visibleToManager as boolean) ?? true,
      visibleToServer: (item.visibleToServer as boolean) ?? false,
      category: item.category as (typeof schema.inventoryItems.$inferInsert)["category"],
    });
    count++;
  }
  console.log(`inventory_items: inserted ${count}`);
}

async function migrateMenuAndSales(userIdMap: Map<string, string>) {
  const existingMenu = await db.select().from(schema.menuItems).limit(1);
  if (existingMenu.length > 0) {
    console.log("menu_items/daily_sales/reminders: already populated, skipping");
    return;
  }

  const { menu, dailySales, reminderCompletions, inventoryAccessSites } = readJson<{
    menu: { id: string; siteId: string; name: string }[];
    dailySales: Record<string, unknown>[];
    reminderCompletions: Record<string, unknown>[];
    inventoryAccessSites: string[];
  }>("sales-config.json");

  const menuIdMap = new Map<string, string>();
  for (const m of menu) {
    const [row] = await db
      .insert(schema.menuItems)
      .values({ siteId: m.siteId as (typeof schema.menuItems.$inferInsert)["siteId"], name: m.name })
      .returning({ id: schema.menuItems.id });
    menuIdMap.set(m.id, row.id);
  }
  console.log(`menu_items: inserted ${menuIdMap.size}`);

  let salesCount = 0;
  for (const entry of dailySales) {
    const oldQuantities = (entry.quantities as Record<string, number>) ?? {};
    const remappedQuantities: Record<string, number> = {};
    for (const [oldMenuItemId, qty] of Object.entries(oldQuantities)) {
      const newId = menuIdMap.get(oldMenuItemId);
      if (newId) remappedQuantities[newId] = qty;
    }
    const oldUserId = entry.recordedByUserId as string;
    const newUserId = userIdMap.get(oldUserId);
    if (!newUserId) {
      console.warn(`daily_sales_entries: skipping entry with unknown recordedByUserId ${oldUserId}`);
      continue;
    }
    await db.insert(schema.dailySalesEntries).values({
      siteId: entry.siteId as (typeof schema.dailySalesEntries.$inferInsert)["siteId"],
      date: entry.date as string,
      cardRevenue: String(entry.cardRevenue ?? 0),
      netRevenue: String(entry.netRevenue ?? 0),
      quantities: remappedQuantities,
      recordedByUserId: newUserId,
      recordedAt: new Date((entry.recordedAt as string) ?? Date.now()),
    });
    salesCount++;
  }
  console.log(`daily_sales_entries: inserted ${salesCount}`);

  let reminderCount = 0;
  for (const r of reminderCompletions) {
    const oldUserId = r.completedByUserId as string;
    const newUserId = userIdMap.get(oldUserId);
    if (!newUserId) {
      console.warn(`reminder_completions: skipping entry with unknown completedByUserId ${oldUserId}`);
      continue;
    }
    await db.insert(schema.reminderCompletions).values({
      siteId: r.siteId as (typeof schema.reminderCompletions.$inferInsert)["siteId"],
      kind: r.kind as (typeof schema.reminderCompletions.$inferInsert)["kind"],
      period: r.period as string,
      completedAt: new Date((r.completedAt as string) ?? Date.now()),
      completedByUserId: newUserId,
    });
    reminderCount++;
  }
  console.log(`reminder_completions: inserted ${reminderCount}`);

  for (const siteId of inventoryAccessSites ?? []) {
    await db
      .insert(schema.inventoryAccessGrants)
      .values({ siteId: siteId as (typeof schema.inventoryAccessGrants.$inferInsert)["siteId"] })
      .onConflictDoNothing();
  }
  console.log(`inventory_access_grants: inserted ${(inventoryAccessSites ?? []).length}`);
}

async function migrateReceipts(userIdMap: Map<string, string>) {
  const existing = await db.select().from(schema.receipts).limit(1);
  if (existing.length > 0) {
    console.log("receipts: already populated, skipping");
    return;
  }

  const { receipts } = readJson<{
    receipts: {
      id: string;
      siteId: string;
      submittedByUserId: string;
      submittedAt: string;
      imagePath: string;
      imageMediaType: string;
      aiSummary: string;
    }[];
  }>("ai-avatar-config.json");

  let count = 0;
  for (const r of receipts) {
    const newUserId = userIdMap.get(r.submittedByUserId);
    if (!newUserId) {
      console.warn(`receipts: skipping ${r.id} with unknown submittedByUserId ${r.submittedByUserId}`);
      continue;
    }
    const localImagePath = path.join(DATA_DIR, "receipts", r.imagePath);
    if (!fs.existsSync(localImagePath)) {
      console.warn(`receipts: skipping ${r.id}, image file missing at ${localImagePath}`);
      continue;
    }
    const bytes = fs.readFileSync(localImagePath);
    const ext = path.extname(r.imagePath);
    const blob = await put(`receipts/${r.siteId}/${crypto.randomUUID()}${ext}`, bytes, {
      access: "private",
      contentType: r.imageMediaType,
      addRandomSuffix: false,
    });

    await db.insert(schema.receipts).values({
      siteId: r.siteId as (typeof schema.receipts.$inferInsert)["siteId"],
      submittedByUserId: newUserId,
      submittedAt: new Date(r.submittedAt),
      imageUrl: blob.url,
      imageMediaType: r.imageMediaType as (typeof schema.receipts.$inferInsert)["imageMediaType"],
      aiSummary: r.aiSummary,
    });
    count++;
  }
  console.log(`receipts: inserted ${count}`);
}

async function main() {
  const userIdMap = await migrateUsers();
  await migrateSuppliersAndInventory();
  await migrateMenuAndSales(userIdMap);
  await migrateReceipts(userIdMap);
  console.log("Migration complete.");
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });

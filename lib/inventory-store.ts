import "server-only";

import { eq } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { inventoryItems, suppliers } from "@/lib/db/schema";
import type { Category, InventoryItem, Role, SiteId, Supplier, Zone } from "@/types";

// Postgres-backed store for suppliers and inventory (migrated off
// data/site-config.json — see scripts/migrate-json-to-postgres.ts for the
// one-off backfill of pre-existing data).

type InventoryItemRow = typeof inventoryItems.$inferSelect;

// `numeric` columns come back as strings from the Postgres driver — cast to
// number here so every caller keeps working with the same InventoryItem
// shape as before the migration.
function toInventoryItem(row: InventoryItemRow): InventoryItem {
  return {
    id: row.id,
    siteId: row.siteId,
    name: row.name,
    zone: row.zone,
    unit: row.unit,
    unitsPerPackage: row.unitsPerPackage,
    packageContentLabel: row.packageContentLabel ?? undefined,
    quantity: Number(row.quantity),
    unitPrice: Number(row.unitPrice),
    supplierId: row.supplierId,
    visibleToManager: row.visibleToManager,
    visibleToServer: row.visibleToServer,
    category: row.category,
  };
}

export async function getSuppliers(): Promise<Supplier[]> {
  return db.select().from(suppliers);
}

export async function getAllInventoryItems(): Promise<InventoryItem[]> {
  const rows = await db.select().from(inventoryItems);
  return rows.map(toInventoryItem);
}

export async function getInventoryBySite(siteId: SiteId): Promise<InventoryItem[]> {
  const rows = await db.select().from(inventoryItems).where(eq(inventoryItems.siteId, siteId));
  return rows.map(toInventoryItem);
}

// Manager-facing read: excludes items the director has hidden for this site.
export async function getVisibleInventoryBySite(siteId: SiteId): Promise<InventoryItem[]> {
  const items = await getInventoryBySite(siteId);
  return items.filter((item) => item.visibleToManager);
}

// Staff-facing read, scoped to whichever visibility flag applies to the
// caller's role. Directors don't call this — they always see everything via
// getInventoryBySite.
export async function getVisibleInventoryBySiteForRole(
  siteId: SiteId,
  role: Role
): Promise<InventoryItem[]> {
  const items = await getInventoryBySite(siteId);
  if (role === "waiter") return items.filter((item) => item.visibleToServer);
  return items.filter((item) => item.visibleToManager);
}

export async function addSupplier(name: string): Promise<Supplier> {
  const [supplier] = await db.insert(suppliers).values({ name }).returning();
  return supplier;
}

export async function renameSupplier(id: string, name: string): Promise<void> {
  await db.update(suppliers).set({ name }).where(eq(suppliers.id, id));
}

export async function deleteSupplier(id: string): Promise<void> {
  // ON DELETE SET NULL on inventory_items.supplier_id handles the
  // "unassign items from this supplier" step at the DB level.
  await db.delete(suppliers).where(eq(suppliers.id, id));
}

export async function setItemSupplier(itemId: string, supplierId: string | null): Promise<void> {
  await db.update(inventoryItems).set({ supplierId }).where(eq(inventoryItems.id, itemId));
}

export async function setItemVisibility(
  itemId: string,
  visible: boolean,
  forRole: "manager" | "waiter" = "manager"
): Promise<void> {
  const column = forRole === "waiter" ? { visibleToServer: visible } : { visibleToManager: visible };
  await db.update(inventoryItems).set(column).where(eq(inventoryItems.id, itemId));
}

export async function setItemCategory(itemId: string, category: Category): Promise<void> {
  await db.update(inventoryItems).set({ category }).where(eq(inventoryItems.id, itemId));
}

export async function updateInventoryItem(
  itemId: string,
  changes: { quantity?: number; unitPrice?: number }
): Promise<void> {
  const values: Partial<typeof inventoryItems.$inferInsert> = {};
  if (changes.quantity !== undefined) values.quantity = changes.quantity.toString();
  if (changes.unitPrice !== undefined) values.unitPrice = changes.unitPrice.toString();
  if (Object.keys(values).length === 0) return;
  await db.update(inventoryItems).set(values).where(eq(inventoryItems.id, itemId));
}

export async function deleteInventoryItem(itemId: string): Promise<void> {
  await db.delete(inventoryItems).where(eq(inventoryItems.id, itemId));
}

export async function addInventoryItem(item: {
  siteId: SiteId;
  name: string;
  unit: string;
  unitsPerPackage: number;
  packageContentLabel?: string;
  category: Category;
  zone: Zone;
  quantity: number;
  unitPrice: number;
}): Promise<InventoryItem> {
  const [row] = await db
    .insert(inventoryItems)
    .values({
      siteId: item.siteId,
      name: item.name,
      unit: item.unit,
      unitsPerPackage: item.unitsPerPackage,
      packageContentLabel: item.packageContentLabel,
      quantity: item.quantity.toString(),
      unitPrice: item.unitPrice.toString(),
      supplierId: null,
      visibleToManager: true,
      visibleToServer: item.category === "boissons",
      category: item.category,
      zone: item.zone,
    })
    .returning();
  return toInventoryItem(row);
}

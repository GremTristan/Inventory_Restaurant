import "server-only";

import fs from "fs";
import path from "path";
import { randomUUID } from "crypto";
import type { Category, InventoryItem, Role, SiteId, Supplier, Zone } from "@/types";
import { initialInventory } from "@/data/inventory";

// File-backed store for suppliers and inventory. Server-only: this touches
// the filesystem synchronously, which only ever runs in Server Components
// or Server Actions. Writes are last-write-wins across concurrent processes —
// acceptable at this app's scale (a handful of sites, one dev/prod instance).
const DATA_FILE = path.join(process.cwd(), "data", "site-config.json");

interface StoreData {
  suppliers: Supplier[];
  inventory: InventoryItem[];
}

function seed(): StoreData {
  return { suppliers: [], inventory: initialInventory };
}

const initialItemById = new Map(initialInventory.map((item) => [item.id, item]));

// Backfills fields added after records may already exist on disk, so older
// JSON files don't silently regress (e.g. items missing `visibleToManager`
// must default to visible, not to `undefined`/falsy). For `category`,
// recover the curated value from the mock seed by id rather than defaulting
// every legacy item to the same bucket — falling back to "sec" only for
// items with no match in the seed at all (shouldn't normally happen).
function normalizeItem(item: InventoryItem): InventoryItem {
  const seedItem = initialItemById.get(item.id);
  return {
    ...item,
    visibleToManager: item.visibleToManager ?? true,
    // Records written before the waiter role existed have no
    // visibleToServer at all — default new/legacy items to the same rule
    // used to seed the mock data: only "boissons" starts visible to staff
    // taking drink orders, everything else needs an explicit opt-in.
    visibleToServer: item.visibleToServer ?? seedItem?.visibleToServer ?? item.category === "boissons",
    category: item.category ?? seedItem?.category ?? "sec",
    // Records written before zones existed have no `zone` — recover it from
    // the seed by id, falling back to the same "boissons = salle, everything
    // else = cuisine" rule used to seed the mock data.
    zone: item.zone ?? seedItem?.zone ?? (item.category === "boissons" ? "salle" : "cuisine"),
    unitsPerPackage: item.unitsPerPackage ?? seedItem?.unitsPerPackage ?? 1,
    packageContentLabel: item.packageContentLabel ?? seedItem?.packageContentLabel,
  };
}

function readStore(): StoreData {
  if (!fs.existsSync(DATA_FILE)) {
    const data = seed();
    writeStore(data);
    return data;
  }
  const raw = fs.readFileSync(DATA_FILE, "utf-8");
  const data = JSON.parse(raw) as StoreData;
  data.inventory = data.inventory.map(normalizeItem);
  return data;
}

function writeStore(data: StoreData) {
  const tmpFile = `${DATA_FILE}.${process.pid}.tmp`;
  fs.writeFileSync(tmpFile, JSON.stringify(data, null, 2), "utf-8");
  fs.renameSync(tmpFile, DATA_FILE);
}

export function getSuppliers(): Supplier[] {
  return readStore().suppliers;
}

export function getAllInventoryItems(): InventoryItem[] {
  return readStore().inventory;
}

export function getInventoryBySite(siteId: SiteId): InventoryItem[] {
  return readStore().inventory.filter((item) => item.siteId === siteId);
}

// Manager-facing read: excludes items the director has hidden for this site.
export function getVisibleInventoryBySite(siteId: SiteId): InventoryItem[] {
  return getInventoryBySite(siteId).filter((item) => item.visibleToManager);
}

// Staff-facing read, scoped to whichever visibility flag applies to the
// caller's role. Directors don't call this — they always see everything via
// getInventoryBySite.
export function getVisibleInventoryBySiteForRole(siteId: SiteId, role: Role): InventoryItem[] {
  const items = getInventoryBySite(siteId);
  if (role === "waiter") return items.filter((item) => item.visibleToServer);
  return items.filter((item) => item.visibleToManager);
}

export function addSupplier(name: string): Supplier {
  const data = readStore();
  const supplier: Supplier = { id: randomUUID(), name };
  data.suppliers.push(supplier);
  writeStore(data);
  return supplier;
}

export function renameSupplier(id: string, name: string) {
  const data = readStore();
  const supplier = data.suppliers.find((s) => s.id === id);
  if (!supplier) return;
  supplier.name = name;
  writeStore(data);
}

export function deleteSupplier(id: string) {
  const data = readStore();
  data.suppliers = data.suppliers.filter((s) => s.id !== id);
  data.inventory = data.inventory.map((item) =>
    item.supplierId === id ? { ...item, supplierId: null } : item
  );
  writeStore(data);
}

export function setItemSupplier(itemId: string, supplierId: string | null) {
  const data = readStore();
  const item = data.inventory.find((i) => i.id === itemId);
  if (!item) return;
  item.supplierId = supplierId;
  writeStore(data);
}

export function setItemVisibility(itemId: string, visible: boolean, forRole: "manager" | "waiter" = "manager") {
  const data = readStore();
  const item = data.inventory.find((i) => i.id === itemId);
  if (!item) return;
  if (forRole === "waiter") {
    item.visibleToServer = visible;
  } else {
    item.visibleToManager = visible;
  }
  writeStore(data);
}

export function setItemCategory(itemId: string, category: Category) {
  const data = readStore();
  const item = data.inventory.find((i) => i.id === itemId);
  if (!item) return;
  item.category = category;
  writeStore(data);
}

export function updateInventoryItem(
  itemId: string,
  changes: { quantity?: number; unitPrice?: number }
) {
  const data = readStore();
  const item = data.inventory.find((i) => i.id === itemId);
  if (!item) return;
  if (changes.quantity !== undefined) item.quantity = changes.quantity;
  if (changes.unitPrice !== undefined) item.unitPrice = changes.unitPrice;
  writeStore(data);
}

export function deleteInventoryItem(itemId: string) {
  const data = readStore();
  data.inventory = data.inventory.filter((i) => i.id !== itemId);
  writeStore(data);
}

export function addInventoryItem(item: {
  siteId: SiteId;
  name: string;
  unit: string;
  unitsPerPackage: number;
  packageContentLabel?: string;
  category: Category;
  zone: Zone;
  quantity: number;
  unitPrice: number;
}): InventoryItem {
  const data = readStore();
  const newItem: InventoryItem = {
    id: randomUUID(),
    siteId: item.siteId,
    name: item.name,
    unit: item.unit,
    unitsPerPackage: item.unitsPerPackage,
    packageContentLabel: item.packageContentLabel,
    quantity: item.quantity,
    unitPrice: item.unitPrice,
    supplierId: null,
    visibleToManager: true,
    visibleToServer: item.category === "boissons",
    category: item.category,
    zone: item.zone,
  };
  data.inventory.push(newItem);
  writeStore(data);
  return newItem;
}

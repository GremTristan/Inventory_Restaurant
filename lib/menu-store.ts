import "server-only";

import { and, asc, eq, inArray } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { menuItemIngredients, menuItems } from "@/lib/db/schema";
import type { MenuCategory, MenuItem, MenuItemIngredient, SiteId } from "@/types";

type MenuRow = typeof menuItems.$inferSelect;

function toMenuItem(row: MenuRow): MenuItem {
  return {
    id: row.id,
    tenantId: row.tenantId,
    siteId: row.siteId,
    name: row.name,
    price: Number(row.price),
    category: row.category,
    available: row.available,
    sortOrder: row.sortOrder,
  };
}

export async function getMenuItems(siteId: SiteId): Promise<MenuItem[]> {
  const rows = await db
    .select()
    .from(menuItems)
    .where(eq(menuItems.siteId, siteId))
    .orderBy(asc(menuItems.sortOrder), asc(menuItems.name));
  return rows.map(toMenuItem);
}

export async function getMenuForTenant(tenantId: string): Promise<MenuItem[]> {
  const rows = await db
    .select()
    .from(menuItems)
    .where(eq(menuItems.tenantId, tenantId))
    .orderBy(asc(menuItems.sortOrder), asc(menuItems.name));
  return rows.map(toMenuItem);
}

export async function getMenuItem(tenantId: string, id: string): Promise<MenuItem | undefined> {
  if (!/^[0-9a-f-]{36}$/i.test(id)) return undefined;
  const [row] = await db
    .select()
    .from(menuItems)
    .where(and(eq(menuItems.id, id), eq(menuItems.tenantId, tenantId)));
  return row ? toMenuItem(row) : undefined;
}

export async function addMenuItem(input: {
  tenantId: string;
  siteId: SiteId;
  name: string;
  price: number;
  category: MenuCategory;
}): Promise<MenuItem> {
  const [item] = await db
    .insert(menuItems)
    .values({
      tenantId: input.tenantId,
      siteId: input.siteId,
      name: input.name,
      price: input.price.toString(),
      category: input.category,
    })
    .returning();
  return toMenuItem(item);
}

export async function updateMenuItem(
  tenantId: string,
  id: string,
  changes: Partial<{ name: string; price: number; category: MenuCategory; available: boolean; sortOrder: number }>
): Promise<void> {
  const values: Partial<typeof menuItems.$inferInsert> = {};
  if (changes.name !== undefined) values.name = changes.name;
  if (changes.price !== undefined) values.price = changes.price.toString();
  if (changes.category !== undefined) values.category = changes.category;
  if (changes.available !== undefined) values.available = changes.available;
  if (changes.sortOrder !== undefined) values.sortOrder = changes.sortOrder;
  if (Object.keys(values).length === 0) return;
  await db
    .update(menuItems)
    .set(values)
    .where(and(eq(menuItems.id, id), eq(menuItems.tenantId, tenantId)));
}

export async function deleteMenuItem(tenantId: string, id: string): Promise<void> {
  await db.delete(menuItems).where(and(eq(menuItems.id, id), eq(menuItems.tenantId, tenantId)));
}

// Copies one site's menu items (name/price/category) to other sites of the
// same tenant. Existing items with the same name get their price updated,
// missing ones are created. Recipes are site-specific and not propagated.
export async function propagateMenu(tenantId: string, fromSiteId: SiteId, toSiteIds: SiteId[]): Promise<number> {
  const source = await getMenuItems(fromSiteId);
  let changed = 0;
  for (const targetSiteId of toSiteIds) {
    if (targetSiteId === fromSiteId) continue;
    const existing = await getMenuItems(targetSiteId);
    const byName = new Map(existing.map((m) => [m.name.trim().toLowerCase(), m]));
    for (const item of source) {
      const match = byName.get(item.name.trim().toLowerCase());
      if (match) {
        if (match.price !== item.price || match.category !== item.category) {
          await updateMenuItem(tenantId, match.id, { price: item.price, category: item.category });
          changed++;
        }
      } else {
        await addMenuItem({ tenantId, siteId: targetSiteId, name: item.name, price: item.price, category: item.category });
        changed++;
      }
    }
  }
  return changed;
}

// --- Recipes ---

export async function getIngredientsForMenuItems(menuItemIds: string[]): Promise<MenuItemIngredient[]> {
  if (menuItemIds.length === 0) return [];
  const rows = await db.select().from(menuItemIngredients).where(inArray(menuItemIngredients.menuItemId, menuItemIds));
  return rows.map((r) => ({
    id: r.id,
    menuItemId: r.menuItemId,
    inventoryItemId: r.inventoryItemId,
    quantity: Number(r.quantity),
  }));
}

export async function setIngredient(menuItemId: string, inventoryItemId: string, quantity: number): Promise<void> {
  if (quantity <= 0) {
    await db
      .delete(menuItemIngredients)
      .where(and(eq(menuItemIngredients.menuItemId, menuItemId), eq(menuItemIngredients.inventoryItemId, inventoryItemId)));
    return;
  }
  await db
    .insert(menuItemIngredients)
    .values({ menuItemId, inventoryItemId, quantity: quantity.toString() })
    .onConflictDoUpdate({
      target: [menuItemIngredients.menuItemId, menuItemIngredients.inventoryItemId],
      set: { quantity: quantity.toString() },
    });
}

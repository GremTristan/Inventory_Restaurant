import "server-only";

import { addInventoryItem } from "@/lib/inventory-store";
import { getMenuItems, recordDailySales } from "@/lib/sales-store";
import type { Category, SiteId, Zone } from "@/types";

// The only module in the import pipeline allowed to write to the database.
// Every upstream agent (classifier, tabular, vision) only ever produces
// plain structured data — never SQL, never a direct store call — so the
// model can misclassify or mis-map a column, but it can never itself decide
// what gets written or execute an arbitrary write. This function is the
// single choke point that turns validated data into real rows.

export interface SalesWriteInput {
  date: string;
  cardRevenue: number;
  netRevenue: number;
  // Menu item *names* as resolved by the calling agent — matched against
  // the site's actual menu here (not upstream) so this module owns the
  // last word on what a valid target row looks like.
  quantitiesByMenuItemName: Record<string, number>;
}

export interface WriteOutcome {
  written: number;
  skipped: { input: unknown; reason: string }[];
}

export async function writeSalesRows(
  siteId: SiteId,
  userId: string,
  rows: SalesWriteInput[]
): Promise<WriteOutcome> {
  const menu = await getMenuItems(siteId);
  const menuIdByNormalizedName = new Map(menu.map((m) => [m.name.trim().toLowerCase(), m.id]));

  const outcome: WriteOutcome = { written: 0, skipped: [] };

  for (const row of rows) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(row.date)) {
      outcome.skipped.push({ input: row, reason: "Date invalide." });
      continue;
    }
    if (row.cardRevenue < 0 || row.netRevenue < 0 || row.netRevenue < row.cardRevenue) {
      outcome.skipped.push({ input: row, reason: "Montants invalides (CA net < CB, ou négatif)." });
      continue;
    }

    const quantities: Record<string, number> = {};
    for (const [name, qty] of Object.entries(row.quantitiesByMenuItemName)) {
      const menuItemId = menuIdByNormalizedName.get(name.trim().toLowerCase());
      if (menuItemId && qty > 0) quantities[menuItemId] = qty;
    }

    await recordDailySales({
      siteId,
      date: row.date,
      cardRevenue: row.cardRevenue,
      netRevenue: row.netRevenue,
      quantities,
      recordedByUserId: userId,
    });
    outcome.written++;
  }

  return outcome;
}

export interface InventoryWriteInput {
  name: string;
  quantity: number;
  unitPrice: number;
  unit: string;
  category: Category;
  zone: Zone;
}

export async function writeInventoryRows(
  siteId: SiteId,
  rows: InventoryWriteInput[]
): Promise<WriteOutcome> {
  const outcome: WriteOutcome = { written: 0, skipped: [] };

  for (const row of rows) {
    if (!row.name.trim()) {
      outcome.skipped.push({ input: row, reason: "Nom d'article manquant." });
      continue;
    }
    if (row.quantity < 0 || row.unitPrice < 0) {
      outcome.skipped.push({ input: row, reason: "Quantité ou prix négatif." });
      continue;
    }

    await addInventoryItem({
      siteId,
      name: row.name.trim(),
      unit: row.unit || "unité",
      unitsPerPackage: 1,
      category: row.category,
      zone: row.zone,
      quantity: row.quantity,
      unitPrice: row.unitPrice,
    });
    outcome.written++;
  }

  return outcome;
}

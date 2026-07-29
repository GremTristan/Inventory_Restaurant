import type {
  Category,
  InventoryItem,
  InventoryItemWithValue,
  SiteId,
  SiteInventoryValue,
  Supplier,
} from "@/types";
import { CATEGORY_LABELS, CATEGORY_ORDER } from "@/types";
import { sites } from "@/data/sites";

export function withStockValue(item: InventoryItem): InventoryItemWithValue {
  return { ...item, stockValue: item.quantity * item.unitPrice };
}

export function totalStockValue(items: InventoryItem[]): number {
  return items.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0);
}

export function inventoryValueBySite(items: InventoryItem[]): SiteInventoryValue[] {
  return sites.map((site) => {
    const siteItems = items.filter((item) => item.siteId === site.id);
    return {
      siteId: site.id,
      siteName: site.name,
      totalValue: totalStockValue(siteItems),
      itemCount: siteItems.length,
    };
  });
}

// Builds the string from Intl's numeric parts only (digits, grouping,
// decimal point) rather than using the `currency` style directly: the
// currency style's symbol placement ("CHF 82.50" vs "82.50 CHF") varies by
// ICU version between server (Node) and browser runtimes, causing a
// hydration mismatch. The numeric formatting itself is stable, so we keep
// that and fix the "CHF" position ourselves.
export function formatCHF(value: number): string {
  const amount = new Intl.NumberFormat("fr-CH", {
    style: "currency",
    currency: "CHF",
  })
    .formatToParts(value)
    .filter((part) => part.type !== "currency" && part.type !== "literal")
    .map((part) => part.value)
    .join("");
  return `${amount} CHF`;
}

export function groupByCategory(
  items: InventoryItem[]
): { category: Category; items: InventoryItem[] }[] {
  return CATEGORY_ORDER.map((category) => ({
    category,
    items: items.filter((item) => item.category === category),
  })).filter((group) => group.items.length > 0);
}

export interface CategoryValueBreakdown {
  category: Category;
  label: string;
  totalValue: number;
  itemCount: number;
  share: number;
}

// Value concentration by category across the whole group — a director
// watches this for over-exposure to perishables ("frais"), the category
// most exposed to shrink/loss risk if stock sits too long.
export function valueByCategory(items: InventoryItem[]): CategoryValueBreakdown[] {
  const grandTotal = totalStockValue(items);
  return CATEGORY_ORDER.map((category) => {
    const categoryItems = items.filter((item) => item.category === category);
    const totalValue = totalStockValue(categoryItems);
    return {
      category,
      label: CATEGORY_LABELS[category],
      totalValue,
      itemCount: categoryItems.length,
      share: grandTotal > 0 ? (totalValue / grandTotal) * 100 : 0,
    };
  }).filter((group) => group.itemCount > 0);
}

export interface SupplierExposure {
  supplierId: string | null;
  supplierName: string;
  totalValue: number;
  itemCount: number;
  share: number;
}

// Supplier concentration by value managed — a director watches this for
// single-supplier dependency risk (one relationship covering too much of
// the group's stock value). Unassigned items are surfaced as their own
// bucket since a missing supplier is itself an operational risk.
export function valueBySupplier(items: InventoryItem[], suppliers: Supplier[]): SupplierExposure[] {
  const grandTotal = totalStockValue(items);
  const supplierById = new Map(suppliers.map((s) => [s.id, s.name]));
  const totals = new Map<string | null, { value: number; count: number }>();

  for (const item of items) {
    const key = item.supplierId;
    const entry = totals.get(key) ?? { value: 0, count: 0 };
    entry.value += item.quantity * item.unitPrice;
    entry.count += 1;
    totals.set(key, entry);
  }

  return Array.from(totals.entries())
    .map(([supplierId, { value, count }]) => ({
      supplierId,
      supplierName: supplierId ? supplierById.get(supplierId) ?? "Fournisseur supprimé" : "Sans fournisseur",
      totalValue: value,
      itemCount: count,
      share: grandTotal > 0 ? (value / grandTotal) * 100 : 0,
    }))
    .sort((a, b) => b.totalValue - a.totalValue);
}

export interface SiteHealth extends SiteInventoryValue {
  unassignedCount: number;
  unassignedShare: number;
  topCategory: { category: Category; label: string; totalValue: number } | null;
}

// Per-site operational health: value, and the share of articles still
// missing a supplier — the leading indicator of supply risk a director can
// act on immediately (an unassigned article has no confirmed restock path).
export function siteHealth(items: InventoryItem[]): SiteHealth[] {
  return sites.map((site) => {
    const siteItems = items.filter((item) => item.siteId === site.id);
    const unassignedCount = siteItems.filter((item) => !item.supplierId).length;
    const categories = valueByCategory(siteItems);
    const topCategory = categories.reduce<CategoryValueBreakdown | null>((top, current) => {
      if (!top || current.totalValue > top.totalValue) return current;
      return top;
    }, null);

    return {
      siteId: site.id,
      siteName: site.name,
      totalValue: totalStockValue(siteItems),
      itemCount: siteItems.length,
      unassignedCount,
      unassignedShare: siteItems.length > 0 ? (unassignedCount / siteItems.length) * 100 : 0,
      topCategory: topCategory
        ? { category: topCategory.category, label: topCategory.label, totalValue: topCategory.totalValue }
        : null,
    };
  });
}

export interface UnassignedGroup {
  siteId: SiteId;
  siteName: string;
  items: InventoryItem[];
}

// Articles with no supplier, grouped by site — the actionable punch list
// behind the "unassigned" risk metric.
export function unassignedBySite(items: InventoryItem[]): UnassignedGroup[] {
  return sites
    .map((site) => ({
      siteId: site.id,
      siteName: site.name,
      items: items.filter((item) => item.siteId === site.id && !item.supplierId),
    }))
    .filter((group) => group.items.length > 0);
}

export type HealthStatus = "good" | "watch" | "critical";

export interface GroupHealthScore {
  score: number;
  status: HealthStatus;
  label: string;
}

// Single composite score (0-100) for the "how are we doing" glance a
// director wants first. Built from the two leading indicators the current
// data model actually supports: how much of the group's stock value has a
// confirmed supplier (supply-risk coverage) and how concentrated that value
// is in one supplier (dependency risk). Weighted 65/35 — an unassigned
// article is an immediate restock gap, while concentration is a slower-
// building risk — then mapped to a status band a non-technical reader can
// act on without reading a percentage.
export function groupHealthScore(items: InventoryItem[], suppliers: Supplier[]): GroupHealthScore {
  const grandTotal = totalStockValue(items);
  const assignedValue = items
    .filter((item) => item.supplierId)
    .reduce((sum, item) => sum + item.quantity * item.unitPrice, 0);
  const coverage = grandTotal > 0 ? (assignedValue / grandTotal) * 100 : 100;

  const exposure = valueBySupplier(items, suppliers);
  const topShare = exposure[0]?.share ?? 0;
  const concentrationScore = Math.max(0, 100 - Math.max(0, topShare - 30) * 1.5);

  const score = Math.round(coverage * 0.65 + concentrationScore * 0.35);

  const status: HealthStatus = score >= 80 ? "good" : score >= 50 ? "watch" : "critical";
  const label = status === "good" ? "Bonne santé" : status === "watch" ? "À surveiller" : "Action requise";

  return { score, status, label };
}

export function siteHealthStatus(site: SiteHealth): HealthStatus {
  if (site.unassignedShare === 0) return "good";
  if (site.unassignedShare < 40) return "watch";
  return "critical";
}

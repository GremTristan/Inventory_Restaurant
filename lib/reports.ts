import "server-only";

import { addDays } from "@/lib/dates";
import { getPaidOrdersForTenant } from "@/lib/order-store";
import type { Order, Site } from "@/types";

export interface SiteRevenue {
  siteId: string;
  siteName: string;
  total: number;
  count: number;
  averageTicket: number;
}

export interface ProductSales {
  menuItemId: string;
  name: string;
  quantity: number;
  revenue: number;
}

export interface DayPoint {
  day: string;
  total: number;
  count: number;
}

export interface SalesReport {
  from: string;
  to: string;
  total: number;
  count: number;
  averageTicket: number;
  bySite: SiteRevenue[];
  topProducts: ProductSales[];
  series: DayPoint[];
  byMethod: { cash: number; card: number; twint: number; other: number };
}

export function buildReport(orders: Order[], sites: Site[], from: string, to: string): SalesReport {
  const paid = orders.filter((o) => o.status === "paid");
  const total = paid.reduce((s, o) => s + o.total, 0);

  const bySite = sites.map((site) => {
    const own = paid.filter((o) => o.siteId === site.id);
    const siteTotal = own.reduce((s, o) => s + o.total, 0);
    return {
      siteId: site.id,
      siteName: site.name,
      total: siteTotal,
      count: own.length,
      averageTicket: own.length ? siteTotal / own.length : 0,
    };
  });

  const products = new Map<string, ProductSales>();
  for (const order of paid) {
    for (const item of order.items) {
      const key = item.menuItemId ?? item.name;
      const entry = products.get(key) ?? { menuItemId: key, name: item.name, quantity: 0, revenue: 0 };
      entry.quantity += item.quantity;
      entry.revenue += item.quantity * item.unitPrice;
      products.set(key, entry);
    }
  }
  const topProducts = Array.from(products.values()).sort((a, b) => b.quantity - a.quantity).slice(0, 10);

  const series: DayPoint[] = [];
  for (let day = from; day <= to; day = addDays(day, 1)) {
    const own = paid.filter((o) => o.serviceDate === day);
    series.push({ day, total: own.reduce((s, o) => s + o.total, 0), count: own.length });
    if (series.length > 62) break;
  }

  const byMethod = { cash: 0, card: 0, twint: 0, other: 0 };
  for (const order of paid) if (order.paymentMethod) byMethod[order.paymentMethod] += order.total;

  return {
    from,
    to,
    total,
    count: paid.length,
    averageTicket: paid.length ? total / paid.length : 0,
    bySite: bySite.sort((a, b) => b.total - a.total),
    topProducts,
    series,
    byMethod,
  };
}

export async function salesReport(tenantId: string, sites: Site[], from: string, to: string): Promise<SalesReport> {
  const orders = await getPaidOrdersForTenant(tenantId, from, to);
  return buildReport(orders, sites, from, to);
}

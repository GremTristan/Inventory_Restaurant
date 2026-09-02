import "server-only";
import { and, count, eq, gte, sql } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { orders, sites, tenants, users } from "@/lib/db/schema";
import { toTenant } from "@/lib/tenant-store";
import type { Tenant } from "@/types";

export interface TenantOverview {
  tenant: Tenant;
  sites: number;
  activeSites: number;
  users: number;
  ordersLast30Days: number;
  lastOrderAt: string | null;
}

// Super-admin view: every customer chain with usage signals, so the editor
// can spot churn risk (no orders for weeks) and support requests quickly.
export async function getTenantOverviews(): Promise<TenantOverview[]> {
  const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  const [tenantRows, siteRows, userRows, orderRows] = await Promise.all([
    db.select().from(tenants).orderBy(tenants.createdAt),
    db
      .select({ tenantId: sites.tenantId, total: count(), active: sql<number>`count(*) filter (where ${sites.active})` })
      .from(sites)
      .groupBy(sites.tenantId),
    db.select({ tenantId: users.tenantId, total: count() }).from(users).groupBy(users.tenantId),
    db
      .select({
        tenantId: orders.tenantId,
        recent: sql<number>`count(*) filter (where ${orders.createdAt} >= ${since})`,
        last: sql<string | null>`max(${orders.createdAt})`,
      })
      .from(orders)
      .groupBy(orders.tenantId),
  ]);
  const siteMap = new Map(siteRows.map((r) => [r.tenantId, r]));
  const userMap = new Map(userRows.map((r) => [r.tenantId, r.total]));
  const orderMap = new Map(orderRows.map((r) => [r.tenantId, r]));
  return tenantRows.map((row) => {
    const s = siteMap.get(row.id);
    const o = orderMap.get(row.id);
    return {
      tenant: toTenant(row),
      sites: s?.total ?? 0,
      activeSites: Number(s?.active ?? 0),
      users: userMap.get(row.id) ?? 0,
      ordersLast30Days: Number(o?.recent ?? 0),
      lastOrderAt: o?.last ? new Date(o.last).toISOString() : null,
    };
  });
}

export async function countActiveSitesForTenant(tenantId: string): Promise<number> {
  const [row] = await db
    .select({ n: count() })
    .from(sites)
    .where(and(eq(sites.tenantId, tenantId), eq(sites.active, true)));
  return row?.n ?? 0;
}

export async function countOrdersLast30Days(tenantId: string): Promise<number> {
  const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  const [row] = await db
    .select({ n: count() })
    .from(orders)
    .where(and(eq(orders.tenantId, tenantId), gte(orders.createdAt, since)));
  return row?.n ?? 0;
}

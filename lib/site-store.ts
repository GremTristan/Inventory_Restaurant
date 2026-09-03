import "server-only";

import { and, eq } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { sites } from "@/lib/db/schema";
import { slugify } from "@/lib/tenant-store";
import type { Site } from "@/types";

type SiteRow = typeof sites.$inferSelect;

function toSite(row: SiteRow): Site {
  return {
    id: row.id,
    tenantId: row.tenantId,
    name: row.name,
    slug: row.slug,
    deviceCode: row.deviceCode,
    active: row.active,
  };
}

// Device codes are typed by hand on a tablet: no ambiguous glyphs (0/O, 1/I).
const CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

export function generateDeviceCode(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(6));
  return Array.from(bytes, (b) => CODE_ALPHABET[b % CODE_ALPHABET.length]).join("");
}

export async function getSitesForTenant(tenantId: string): Promise<Site[]> {
  const rows = await db.select().from(sites).where(eq(sites.tenantId, tenantId)).orderBy(sites.createdAt);
  return rows.map(toSite);
}

export async function getSiteById(id: string): Promise<Site | undefined> {
  if (!/^[0-9a-f-]{36}$/i.test(id)) return undefined;
  const [row] = await db.select().from(sites).where(eq(sites.id, id));
  return row ? toSite(row) : undefined;
}

// Tenant-scoped lookup: the site must exist AND belong to the caller's
// tenant, otherwise it is treated as non-existent (no information leak).
export async function getSiteForTenant(tenantId: string, siteId: string): Promise<Site | undefined> {
  if (!/^[0-9a-f-]{36}$/i.test(siteId)) return undefined;
  const [row] = await db
    .select()
    .from(sites)
    .where(and(eq(sites.id, siteId), eq(sites.tenantId, tenantId)));
  return row ? toSite(row) : undefined;
}

export async function getSiteByDeviceCode(code: string): Promise<Site | undefined> {
  const normalized = code.trim().toUpperCase().replace(/[^A-Z0-9]/g, "");
  if (normalized.length < 4) return undefined;
  const [row] = await db.select().from(sites).where(eq(sites.deviceCode, normalized));
  return row && row.active ? toSite(row) : undefined;
}

export async function createSite(tenantId: string, name: string): Promise<Site> {
  const base = slugify(name) || "site";
  const existing = await getSitesForTenant(tenantId);
  let slug = base;
  let n = 2;
  while (existing.some((s) => s.slug === slug)) slug = `${base}-${n++}`;

  for (let attempt = 0; attempt < 5; attempt++) {
    try {
      const [row] = await db
        .insert(sites)
        .values({ tenantId, name: name.trim(), slug, deviceCode: generateDeviceCode() })
        .returning();
      return toSite(row);
    } catch (error) {
      // Device code collision (unique index) — extremely unlikely, retry.
      if (attempt === 4) throw error;
    }
  }
  throw new Error("unreachable");
}

export async function renameSite(tenantId: string, siteId: string, name: string): Promise<void> {
  await db
    .update(sites)
    .set({ name: name.trim() })
    .where(and(eq(sites.id, siteId), eq(sites.tenantId, tenantId)));
}

export async function setSiteActive(tenantId: string, siteId: string, active: boolean): Promise<void> {
  await db
    .update(sites)
    .set({ active })
    .where(and(eq(sites.id, siteId), eq(sites.tenantId, tenantId)));
}

export async function rotateDeviceCode(tenantId: string, siteId: string): Promise<string> {
  const code = generateDeviceCode();
  await db
    .update(sites)
    .set({ deviceCode: code })
    .where(and(eq(sites.id, siteId), eq(sites.tenantId, tenantId)));
  return code;
}

export async function deleteSite(tenantId: string, siteId: string): Promise<void> {
  await db.delete(sites).where(and(eq(sites.id, siteId), eq(sites.tenantId, tenantId)));
}

export async function countSitesForTenant(tenantId: string): Promise<number> {
  const rows = await db.select({ id: sites.id }).from(sites).where(and(eq(sites.tenantId, tenantId), eq(sites.active, true)));
  return rows.length;
}

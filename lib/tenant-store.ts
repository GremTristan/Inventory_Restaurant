import "server-only";

import { eq } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { tenants } from "@/lib/db/schema";
import type { Plan, Tenant, TenantStatus } from "@/types";

type TenantRow = typeof tenants.$inferSelect;

export function toTenant(row: TenantRow): Tenant {
  return {
    id: row.id,
    name: row.name,
    slug: row.slug,
    brandColor: row.brandColor,
    logoUrl: row.logoUrl,
    currency: row.currency,
    status: row.status,
    plan: row.plan,
    trialEndsAt: row.trialEndsAt ? row.trialEndsAt.toISOString() : null,
    stripeCustomerId: row.stripeCustomerId,
    stripeSubscriptionId: row.stripeSubscriptionId,
    billingEmail: row.billingEmail,
    legalName: row.legalName,
    legalAddress: row.legalAddress,
    createdAt: row.createdAt.toISOString(),
  };
}

export async function getTenantById(id: string): Promise<Tenant | undefined> {
  const [row] = await db.select().from(tenants).where(eq(tenants.id, id));
  return row ? toTenant(row) : undefined;
}

export async function getTenantBySlug(slug: string): Promise<Tenant | undefined> {
  const [row] = await db.select().from(tenants).where(eq(tenants.slug, slug));
  return row ? toTenant(row) : undefined;
}

export async function getTenantByStripeCustomer(customerId: string): Promise<Tenant | undefined> {
  const [row] = await db.select().from(tenants).where(eq(tenants.stripeCustomerId, customerId));
  return row ? toTenant(row) : undefined;
}

export async function getAllTenants(): Promise<Tenant[]> {
  const rows = await db.select().from(tenants).orderBy(tenants.createdAt);
  return rows.map(toTenant);
}

export function slugify(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40);
}

export async function createTenant(input: {
  name: string;
  billingEmail: string;
  trialDays: number;
}): Promise<Tenant> {
  const base = slugify(input.name) || "chaine";
  let slug = base;
  for (let attempt = 0; attempt < 5; attempt++) {
    const existing = await getTenantBySlug(slug);
    if (!existing) break;
    slug = `${base}-${Math.random().toString(36).slice(2, 6)}`;
  }
  const trialEndsAt = new Date(Date.now() + input.trialDays * 24 * 60 * 60 * 1000);
  const [row] = await db
    .insert(tenants)
    .values({ name: input.name, slug, billingEmail: input.billingEmail, status: "trial", trialEndsAt })
    .returning();
  return toTenant(row);
}

export async function updateTenant(
  id: string,
  changes: Partial<{
    name: string;
    brandColor: string | null;
    logoUrl: string | null;
    currency: string;
    status: TenantStatus;
    plan: Plan;
    trialEndsAt: Date | null;
    stripeCustomerId: string | null;
    stripeSubscriptionId: string | null;
    billingEmail: string | null;
    legalName: string | null;
    legalAddress: string | null;
  }>
): Promise<void> {
  if (Object.keys(changes).length === 0) return;
  await db.update(tenants).set(changes).where(eq(tenants.id, id));
}

export async function deleteTenant(id: string): Promise<void> {
  // Every business table cascades on tenant_id, so this is the full purge
  // behind a GDPR "delete my data" request.
  await db.delete(tenants).where(eq(tenants.id, id));
}

// A tenant may use the product while trialing, active, or briefly past due
// (card retry window). Canceled/suspended tenants are read-only-blocked.
export function isTenantUsable(tenant: Tenant): boolean {
  if (tenant.status === "active" || tenant.status === "past_due") return true;
  if (tenant.status === "trial") {
    return !tenant.trialEndsAt || new Date(tenant.trialEndsAt).getTime() > Date.now();
  }
  return false;
}

export function trialDaysLeft(tenant: Tenant): number | null {
  if (tenant.status !== "trial" || !tenant.trialEndsAt) return null;
  return Math.max(0, Math.ceil((new Date(tenant.trialEndsAt).getTime() - Date.now()) / (24 * 60 * 60 * 1000)));
}

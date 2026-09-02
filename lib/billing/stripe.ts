import "server-only";

import Stripe from "stripe";
import { audit } from "@/lib/audit";
import { countSitesForTenant } from "@/lib/site-store";
import { getTenantById, getTenantByStripeCustomer, updateTenant } from "@/lib/tenant-store";
import type { Plan, Tenant, TenantStatus } from "@/types";

// Stripe Billing: one subscription per tenant, quantity = active sites.
// Everything degrades gracefully when the keys are absent (local dev,
// demos): the subscription page explains that billing isn't configured.

const PRICE_ENV: Record<Plan, string> = {
  essentiel: "STRIPE_PRICE_ESSENTIEL",
  pro: "STRIPE_PRICE_PRO",
};

export function stripeConfigured(): boolean {
  return Boolean(process.env.STRIPE_SECRET_KEY && process.env.STRIPE_PRICE_ESSENTIEL && process.env.STRIPE_PRICE_PRO);
}

let client: Stripe | null = null;
export function stripe(): Stripe {
  if (!process.env.STRIPE_SECRET_KEY) throw new Error("La facturation n’est pas configurée.");
  client ??= new Stripe(process.env.STRIPE_SECRET_KEY);
  return client;
}

function priceFor(plan: Plan): string {
  const id = process.env[PRICE_ENV[plan]];
  if (!id) throw new Error("La facturation n’est pas configurée.");
  return id;
}

function planFromPrice(priceId: string | undefined): Plan | null {
  if (!priceId) return null;
  if (priceId === process.env.STRIPE_PRICE_PRO) return "pro";
  if (priceId === process.env.STRIPE_PRICE_ESSENTIEL) return "essentiel";
  return null;
}

export function appUrl(): string {
  return (process.env.APP_URL ?? "http://localhost:3000").replace(/\/$/, "");
}

async function ensureCustomer(tenant: Tenant): Promise<string> {
  if (tenant.stripeCustomerId) return tenant.stripeCustomerId;
  const customer = await stripe().customers.create({
    name: tenant.legalName ?? tenant.name,
    email: tenant.billingEmail ?? undefined,
    metadata: { tenantId: tenant.id },
  });
  await updateTenant(tenant.id, { stripeCustomerId: customer.id });
  return customer.id;
}

export async function createCheckoutUrl(tenant: Tenant, plan: Plan): Promise<string> {
  const customer = await ensureCustomer(tenant);
  const quantity = Math.max(1, await countSitesForTenant(tenant.id));
  const session = await stripe().checkout.sessions.create({
    mode: "subscription",
    customer,
    line_items: [{ price: priceFor(plan), quantity }],
    allow_promotion_codes: true,
    billing_address_collection: "required",
    tax_id_collection: { enabled: true },
    success_url: `${appUrl()}/direction/abonnement?succes=1`,
    cancel_url: `${appUrl()}/direction/abonnement`,
    subscription_data: { metadata: { tenantId: tenant.id, plan } },
    metadata: { tenantId: tenant.id, plan },
    locale: "fr",
  });
  if (!session.url) throw new Error("Impossible d’ouvrir le paiement.");
  return session.url;
}

// Stripe's hosted portal handles card changes, invoices and cancellation —
// no need to rebuild those screens.
export async function createPortalUrl(tenant: Tenant): Promise<string> {
  const customer = await ensureCustomer(tenant);
  const session = await stripe().billingPortal.sessions.create({
    customer,
    return_url: `${appUrl()}/direction/abonnement`,
    locale: "fr",
  });
  return session.url;
}

// Called when sites are added/paused so the invoice follows reality.
export async function syncSeatCount(tenantId: string): Promise<void> {
  if (!stripeConfigured()) return;
  const tenant = await getTenantById(tenantId);
  if (!tenant?.stripeSubscriptionId) return;
  try {
    const subscription = await stripe().subscriptions.retrieve(tenant.stripeSubscriptionId);
    const item = subscription.items.data[0];
    if (!item) return;
    const quantity = Math.max(1, await countSitesForTenant(tenant.id));
    if (item.quantity !== quantity) {
      await stripe().subscriptionItems.update(item.id, { quantity, proration_behavior: "create_prorations" });
    }
  } catch (error) {
    console.error("[billing] seat sync failed", error);
  }
}

function mapStatus(status: Stripe.Subscription.Status): TenantStatus {
  switch (status) {
    case "active":
    case "trialing":
      return "active";
    case "past_due":
    case "unpaid":
    case "incomplete":
      return "past_due";
    case "canceled":
    case "incomplete_expired":
    case "paused":
      return "canceled";
    default:
      return "past_due";
  }
}

async function applySubscription(subscription: Stripe.Subscription): Promise<void> {
  const customerId = typeof subscription.customer === "string" ? subscription.customer : subscription.customer.id;
  const tenant =
    (subscription.metadata?.tenantId ? await getTenantById(subscription.metadata.tenantId) : undefined) ??
    (await getTenantByStripeCustomer(customerId));
  if (!tenant) {
    console.warn("[billing] subscription for unknown tenant", subscription.id);
    return;
  }
  const plan = planFromPrice(subscription.items.data[0]?.price.id) ?? tenant.plan;
  const status = mapStatus(subscription.status);
  await updateTenant(tenant.id, {
    stripeCustomerId: customerId,
    stripeSubscriptionId: status === "canceled" ? null : subscription.id,
    status,
    plan,
    trialEndsAt: null,
  });
  await audit({ tenantId: tenant.id, userId: null, action: `billing.${status}`, details: { plan, subscription: subscription.id } });
}

export async function handleWebhookEvent(event: Stripe.Event): Promise<void> {
  switch (event.type) {
    case "checkout.session.completed": {
      const session = event.data.object;
      if (session.mode === "subscription" && session.subscription) {
        const id = typeof session.subscription === "string" ? session.subscription : session.subscription.id;
        await applySubscription(await stripe().subscriptions.retrieve(id));
      }
      break;
    }
    case "customer.subscription.created":
    case "customer.subscription.updated":
    case "customer.subscription.deleted":
      await applySubscription(event.data.object);
      break;
    case "invoice.payment_failed": {
      const invoice = event.data.object;
      const customerId = typeof invoice.customer === "string" ? invoice.customer : invoice.customer?.id;
      if (customerId) {
        const tenant = await getTenantByStripeCustomer(customerId);
        if (tenant && tenant.status === "active") {
          await updateTenant(tenant.id, { status: "past_due" });
          await audit({ tenantId: tenant.id, userId: null, action: "billing.payment_failed" });
        }
      }
      break;
    }
    default:
      break;
  }
}

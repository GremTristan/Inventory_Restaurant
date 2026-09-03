"use server";

import { redirect } from "next/navigation";
import { audit } from "@/lib/audit";
import { createCheckoutUrl, createPortalUrl, stripeConfigured } from "@/lib/billing/stripe";
import { requireDirector } from "@/lib/session";
import type { Plan } from "@/types";

export async function startCheckoutAction(formData: FormData): Promise<void> {
  const { user, tenant } = await requireDirector({ allowInactiveTenant: true });
  if (!stripeConfigured()) throw new Error("La facturation n’est pas encore configurée.");
  const plan = formData.get("plan") === "pro" ? "pro" : ("essentiel" satisfies Plan);
  const url = await createCheckoutUrl(tenant, plan);
  await audit({ tenantId: tenant.id, userId: user.id, action: "billing.checkout_started", details: { plan } });
  redirect(url);
}

export async function openPortalAction(): Promise<void> {
  const { tenant } = await requireDirector({ allowInactiveTenant: true });
  if (!stripeConfigured()) throw new Error("La facturation n’est pas encore configurée.");
  redirect(await createPortalUrl(tenant));
}

"use server";

import { revalidatePath } from "next/cache";
import { requireSiteAccess } from "@/lib/session";
import { getMenuItems, markReminderComplete, recordDailySales, todayPeriod } from "@/lib/sales-store";
import { getSiteById } from "@/data/sites";
import type { SiteId } from "@/types";

export async function recordDailySalesAction(formData: FormData) {
  const siteId = formData.get("siteId");
  if (typeof siteId !== "string" || !getSiteById(siteId)) {
    throw new Error("Site invalide");
  }

  const user = await requireSiteAccess(siteId as SiteId, ["waiter"]);

  const cardRevenue = Number(formData.get("cardRevenue"));
  const netRevenue = Number(formData.get("netRevenue"));
  if (!Number.isFinite(cardRevenue) || cardRevenue < 0) {
    throw new Error("Montant CB invalide");
  }
  if (!Number.isFinite(netRevenue) || netRevenue < 0) {
    throw new Error("Chiffre d'affaires net invalide");
  }
  if (netRevenue < cardRevenue) {
    throw new Error("Le chiffre d'affaires net ne peut pas être inférieur au montant CB");
  }

  const menu = await getMenuItems(siteId as SiteId);
  const quantities: Record<string, number> = {};
  for (const item of menu) {
    const raw = formData.get(`quantities[${item.id}]`);
    const quantity = Number(raw ?? 0);
    quantities[item.id] = Number.isFinite(quantity) && quantity > 0 ? quantity : 0;
  }

  const date = todayPeriod();
  await recordDailySales({
    siteId: siteId as SiteId,
    date,
    cardRevenue,
    netRevenue,
    quantities,
    recordedByUserId: user.id,
  });

  // Submitting the day's sales form is itself the completion of the
  // "daily-sales" reminder — no separate manual click needed for the same
  // task. The monthly inventory reminder stays manual (no single action to
  // hook it to).
  await markReminderComplete(siteId as SiteId, "daily-sales", date, user.id);

  revalidatePath(`/inventory/${siteId}/sales`);
  revalidatePath(`/inventory/${siteId}`);
}

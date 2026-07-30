"use server";

import { revalidatePath } from "next/cache";
import { requireSiteAccess } from "@/lib/session";
import { markReminderComplete, monthPeriod, todayPeriod } from "@/lib/sales-store";
import { getSiteById } from "@/data/sites";
import type { ReminderKind, SiteId } from "@/types";

export async function markReminderCompleteAction(formData: FormData) {
  const siteId = formData.get("siteId");
  const kind = formData.get("kind");
  if (
    typeof siteId !== "string" ||
    !getSiteById(siteId) ||
    (kind !== "daily-sales" && kind !== "monthly-inventory")
  ) {
    throw new Error("Données invalides");
  }

  const user = await requireSiteAccess(siteId as SiteId);

  // Period is always computed server-side, never trusted from the client —
  // otherwise a stale/tampered value could mark a different day or month
  // done than the one actually being acknowledged.
  const period = (kind as ReminderKind) === "daily-sales" ? todayPeriod() : monthPeriod();
  await markReminderComplete(siteId as SiteId, kind as ReminderKind, period, user.id);

  revalidatePath(`/inventory/${siteId}`);
}

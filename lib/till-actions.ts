"use server";

import { revalidatePath } from "next/cache";
import { audit } from "@/lib/audit";
import { todayPeriod } from "@/lib/dates";
import { getOrdersForDay, summarizePaid } from "@/lib/order-store";
import { markReminderComplete, recordDailySales } from "@/lib/sales-store";
import { requireSiteAccess } from "@/lib/session";

// End of day: freezes the till figures into the daily closure the director
// reads, and clears the "clôture" reminder. Re-running it simply refreshes
// the numbers (upsert).
export async function closeDayAction(formData: FormData): Promise<void> {
  const siteId = String(formData.get("siteId") ?? "");
  const { user, tenant, site } = await requireSiteAccess(siteId, ["waiter"]);
  const day = todayPeriod();
  const orders = await getOrdersForDay(site.id, day);
  const totals = summarizePaid(orders);

  await recordDailySales({
    tenantId: tenant.id,
    siteId: site.id,
    date: day,
    cardRevenue: totals.byMethod.card,
    twintRevenue: totals.byMethod.twint,
    netRevenue: totals.total,
    quantities: totals.quantitiesByMenuItemId,
    recordedByUserId: user.id,
  });
  await markReminderComplete(site.id, "daily-sales", day, user.id);
  await audit({
    tenantId: tenant.id,
    siteId: site.id,
    userId: user.id,
    action: "till.close",
    details: { day, total: totals.total, count: totals.count },
  });
  revalidatePath(`/s/${site.id}/caisse`);
}

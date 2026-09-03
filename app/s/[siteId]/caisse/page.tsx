import type { Metadata } from "next";
import { Till } from "@/components/staff/till";
import { todayPeriod } from "@/lib/dates";
import { getActiveOrders, getOrdersForDay } from "@/lib/order-store";
import { pageSite } from "@/lib/page-guards";
import { getPendingReminders } from "@/lib/sales-store";

export const metadata: Metadata = { title: "Caisse" };

export default async function CaissePage({
  params,
  searchParams,
}: {
  params: Promise<{ siteId: string }>;
  searchParams: Promise<{ commande?: string }>;
}) {
  const { siteId } = await params;
  const { commande } = await searchParams;
  const { tenant, site } = await pageSite(siteId, ["waiter"]);
  const [active, today, reminders] = await Promise.all([
    getActiveOrders(site.id),
    getOrdersForDay(site.id, todayPeriod()),
    getPendingReminders(site.id),
  ]);
  return (
    <Till
      siteId={site.id}
      currency={tenant.currency}
      initialActive={active}
      initialPaidToday={today.filter((o) => o.status === "paid")}
      preselectOrderId={commande ?? null}
      dayClosed={!reminders.some((r) => r.kind === "daily-sales")}
    />
  );
}

import type { Metadata } from "next";
import { StockCounter } from "@/components/staff/stock-counter";
import { getStaffInventoryBySite } from "@/lib/inventory-store";
import { pageSite } from "@/lib/page-guards";
import { getPendingReminders } from "@/lib/sales-store";

export const metadata: Metadata = { title: "Stock" };

export default async function StockPage({ params }: { params: Promise<{ siteId: string }> }) {
  const { siteId } = await params;
  const { user, site } = await pageSite(siteId, ["cook"]);
  const [items, reminders] = await Promise.all([
    getStaffInventoryBySite(site.id, user.role === "director" ? "cook" : user.role),
    getPendingReminders(site.id),
  ]);
  return (
    <StockCounter
      siteId={site.id}
      initialItems={items}
      inventoryDue={reminders.some((r) => r.kind === "monthly-inventory")}
    />
  );
}

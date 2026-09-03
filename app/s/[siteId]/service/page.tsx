import type { Metadata } from "next";
import { ServiceBoard } from "@/components/staff/service-board";
import { getActiveOrders } from "@/lib/order-store";
import { pageSite } from "@/lib/page-guards";

export const metadata: Metadata = { title: "Service" };

export default async function ServicePage({ params }: { params: Promise<{ siteId: string }> }) {
  const { siteId } = await params;
  const { tenant, site } = await pageSite(siteId, ["waiter"]);
  const active = await getActiveOrders(site.id);
  return <ServiceBoard siteId={site.id} currency={tenant.currency} initialActive={active} />;
}

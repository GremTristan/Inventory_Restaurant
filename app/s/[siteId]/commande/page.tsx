import type { Metadata } from "next";
import { OrderComposer } from "@/components/staff/order-composer";
import { getMenuItems } from "@/lib/menu-store";
import { getOrder } from "@/lib/order-store";
import { pageSite } from "@/lib/page-guards";

export const metadata: Metadata = { title: "Nouvelle commande" };

export default async function CommandePage({
  params,
  searchParams,
}: {
  params: Promise<{ siteId: string }>;
  searchParams: Promise<{ commande?: string }>;
}) {
  const { siteId } = await params;
  const { commande } = await searchParams;
  const { tenant, site } = await pageSite(siteId, ["waiter"]);
  const [menu, existing] = await Promise.all([
    getMenuItems(site.id),
    commande ? getOrder(tenant.id, commande) : Promise.resolve(undefined),
  ]);
  const appendTo =
    existing && existing.siteId === site.id && existing.status !== "paid" && existing.status !== "cancelled" ? existing : null;

  return (
    <OrderComposer siteId={site.id} menu={menu.filter((m) => m.available)} currency={tenant.currency} appendTo={appendTo} />
  );
}

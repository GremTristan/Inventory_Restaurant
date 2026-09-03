import type { Metadata } from "next";
import { KdsBoard } from "@/components/staff/kds-board";
import { getKitchenQueue } from "@/lib/order-store";
import { pageSite } from "@/lib/page-guards";

export const metadata: Metadata = { title: "Cuisine" };

export default async function CuisinePage({ params }: { params: Promise<{ siteId: string }> }) {
  const { siteId } = await params;
  const { site } = await pageSite(siteId, ["cook"]);
  const queue = await getKitchenQueue(site.id);
  return <KdsBoard siteId={site.id} initialQueue={queue} />;
}

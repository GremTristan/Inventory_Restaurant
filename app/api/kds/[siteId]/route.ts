import { NextResponse } from "next/server";
import { handle, readJson } from "@/lib/api";
import { getKitchenQueue, markOrderPreparing, markOrderReady } from "@/lib/order-store";
import { requireSiteAccess } from "@/lib/session";

type Params = { params: Promise<{ siteId: string }> };

export async function GET(_request: Request, { params }: Params) {
  return handle(async () => {
    const { siteId } = await params;
    const { site } = await requireSiteAccess(siteId, ["cook"]);
    const queue = await getKitchenQueue(site.id);
    return NextResponse.json({ queue, serverTime: new Date().toISOString() });
  });
}

// Idempotent status flips so the offline queue can replay safely.
export async function POST(request: Request, { params }: Params) {
  return handle(async () => {
    const { siteId } = await params;
    const { tenant, site } = await requireSiteAccess(siteId, ["cook"]);
    const body = await readJson<{ action: "ready" | "preparing"; orderId: string }>(request);
    if (typeof body.orderId !== "string") throw new Error("Commande introuvable");
    if (body.action === "ready") await markOrderReady(tenant.id, site.id, body.orderId);
    else if (body.action === "preparing") await markOrderPreparing(tenant.id, site.id, body.orderId);
    else throw new Error("Action inconnue");
    return NextResponse.json({ ok: true });
  });
}

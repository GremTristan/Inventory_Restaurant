import { NextResponse } from "next/server";
import { handle, readJson } from "@/lib/api";
import { getStaffInventoryBySite, setItemQuantity } from "@/lib/inventory-store";
import { markReminderComplete, monthPeriod } from "@/lib/sales-store";
import { requireSiteAccess } from "@/lib/session";

type Params = { params: Promise<{ siteId: string }> };

export async function GET(_request: Request, { params }: Params) {
  return handle(async () => {
    const { siteId } = await params;
    const { user, site } = await requireSiteAccess(siteId, ["cook"]);
    const items = await getStaffInventoryBySite(site.id, user.role);
    return NextResponse.json({ items });
  });
}

type Body =
  | { action: "set"; itemId: string; quantity: number }
  | { action: "inventory-done" };

// Absolute quantities (not deltas) so an offline replay is idempotent: the
// last count wins, exactly like a paper stock sheet.
export async function POST(request: Request, { params }: Params) {
  return handle(async () => {
    const { siteId } = await params;
    const { user, tenant, site } = await requireSiteAccess(siteId, ["cook"]);
    const body = await readJson<Body>(request);

    if (body.action === "inventory-done") {
      await markReminderComplete(site.id, "monthly-inventory", monthPeriod(), user.id);
      return NextResponse.json({ ok: true });
    }
    if (body.action === "set") {
      const quantity = Number(body.quantity);
      if (typeof body.itemId !== "string" || !Number.isFinite(quantity) || quantity < 0 || quantity > 1_000_000) {
        throw new Error("Quantité invalide");
      }
      await setItemQuantity({
        tenantId: tenant.id,
        siteId: site.id,
        itemId: body.itemId,
        quantity: Math.round(quantity * 1000) / 1000,
        userId: user.id,
        reason: "count",
      });
      return NextResponse.json({ ok: true });
    }
    throw new Error("Action inconnue");
  });
}

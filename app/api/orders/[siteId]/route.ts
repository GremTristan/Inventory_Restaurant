import { NextResponse } from "next/server";
import { handle, readJson } from "@/lib/api";
import { audit } from "@/lib/audit";
import { getMenuItems } from "@/lib/menu-store";
import {
  appendOrderLines,
  cancelOrder,
  createOrder,
  getActiveOrders,
  getOrdersForDay,
  markOrderServed,
  payOrder,
  type NewOrderLine,
} from "@/lib/order-store";
import { requireSiteAccess } from "@/lib/session";
import { todayPeriod } from "@/lib/dates";
import type { OrderKind, PaymentMethod } from "@/types";

const SERVICE_ROLES = ["waiter"] as const;
const PAYMENT_METHODS: PaymentMethod[] = ["cash", "card", "twint", "other"];

type Params = { params: Promise<{ siteId: string }> };

// Live board for the service screen: active orders + today's paid ones.
export async function GET(_request: Request, { params }: Params) {
  return handle(async () => {
    const { siteId } = await params;
    const { site } = await requireSiteAccess(siteId, [...SERVICE_ROLES]);
    const [active, today, menu] = await Promise.all([
      getActiveOrders(site.id),
      getOrdersForDay(site.id, todayPeriod()),
      getMenuItems(site.id),
    ]);
    return NextResponse.json({
      active,
      paidToday: today.filter((o) => o.status === "paid"),
      menu: menu.filter((m) => m.available),
      serverTime: new Date().toISOString(),
    });
  });
}

interface CreateBody {
  kind: OrderKind;
  tableLabel?: string | null;
  note?: string | null;
  lines: NewOrderLine[];
  clientId?: string | null;
}

function cleanLines(lines: unknown): NewOrderLine[] {
  if (!Array.isArray(lines)) throw new Error("Commande vide");
  return lines
    .filter((l): l is NewOrderLine => Boolean(l) && typeof l.menuItemId === "string")
    .map((l) => ({
      menuItemId: l.menuItemId,
      quantity: Math.max(1, Math.min(99, Math.round(Number(l.quantity) || 1))),
      note: typeof l.note === "string" && l.note.trim() ? l.note.trim().slice(0, 140) : undefined,
    }));
}

// One tap: creates the ticket AND sends it to the kitchen.
export async function POST(request: Request, { params }: Params) {
  return handle(async () => {
    const { siteId } = await params;
    const { user, tenant, site } = await requireSiteAccess(siteId, [...SERVICE_ROLES]);
    const body = await readJson<CreateBody>(request);
    const kind: OrderKind = body.kind === "takeaway" ? "takeaway" : "table";
    const order = await createOrder({
      tenantId: tenant.id,
      siteId: site.id,
      userId: user.id,
      kind,
      tableLabel: typeof body.tableLabel === "string" && body.tableLabel.trim() ? body.tableLabel.trim().slice(0, 20) : null,
      note: typeof body.note === "string" && body.note.trim() ? body.note.trim().slice(0, 200) : null,
      lines: cleanLines(body.lines),
      clientId: typeof body.clientId === "string" ? body.clientId.slice(0, 64) : null,
    });
    return NextResponse.json({ order }, { status: 201 });
  });
}

type PatchBody =
  | { action: "pay"; orderId: string; method: PaymentMethod }
  | { action: "serve"; orderId: string }
  | { action: "cancel"; orderId: string }
  | { action: "append"; orderId: string; lines: NewOrderLine[] };

export async function PATCH(request: Request, { params }: Params) {
  return handle(async () => {
    const { siteId } = await params;
    const { user, tenant, site } = await requireSiteAccess(siteId, [...SERVICE_ROLES]);
    const body = await readJson<PatchBody>(request);
    if (typeof body.orderId !== "string") throw new Error("Commande introuvable");
    const ctx = { tenantId: tenant.id, siteId: site.id };

    switch (body.action) {
      case "pay": {
        if (!PAYMENT_METHODS.includes(body.method)) throw new Error("Mode de paiement inconnu");
        const order = await payOrder({ ...ctx, orderId: body.orderId, method: body.method, userId: user.id });
        return NextResponse.json({ order });
      }
      case "serve":
        await markOrderServed(tenant.id, site.id, body.orderId);
        return NextResponse.json({ ok: true });
      case "cancel":
        await cancelOrder(tenant.id, site.id, body.orderId);
        await audit({ tenantId: tenant.id, siteId: site.id, userId: user.id, action: "order.cancel", targetType: "order", targetId: body.orderId });
        return NextResponse.json({ ok: true });
      case "append": {
        const order = await appendOrderLines({ ...ctx, userId: user.id, orderId: body.orderId, lines: cleanLines(body.lines) });
        return NextResponse.json({ order });
      }
      default:
        throw new Error("Action inconnue");
    }
  });
}

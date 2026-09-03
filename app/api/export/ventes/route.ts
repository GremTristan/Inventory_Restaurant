import { handle } from "@/lib/api";
import { canUse } from "@/lib/billing/plans";
import { addDays, startOfMonth, startOfWeek, todayPeriod } from "@/lib/dates";
import { getPaidOrdersForTenant } from "@/lib/order-store";
import { requireDirector, UnauthorizedError } from "@/lib/session";
import { getSitesForTenant } from "@/lib/site-store";
import { PAYMENT_METHOD_LABELS } from "@/types";

function csvCell(value: string | number | null | undefined): string {
  const s = value === null || value === undefined ? "" : String(value);
  return /[";\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

// Director-only CSV of paid tickets (one line per ticket line) — the bridge
// to an accountant or an existing POS/back-office. Semicolon-separated for
// French/Swiss Excel.
export async function GET(request: Request) {
  return handle(async () => {
    const { tenant } = await requireDirector();
    if (!canUse(tenant, "exports")) throw new UnauthorizedError("L’export est inclus dans la formule Pro.");
    const url = new URL(request.url);
    const today = todayPeriod();
    const period = url.searchParams.get("periode") ?? "semaine";
    const siteFilter = url.searchParams.get("site");
    const from =
      period === "jour" ? today : period === "mois" ? startOfMonth(today) : period === "30j" ? addDays(today, -29) : startOfWeek(today);

    const [orders, sites] = await Promise.all([getPaidOrdersForTenant(tenant.id, from, today), getSitesForTenant(tenant.id)]);
    const siteName = new Map(sites.map((s) => [s.id, s.name]));

    const header = ["Date", "Établissement", "Ticket", "Type", "Table", "Produit", "Quantité", "Prix unitaire", "Total ligne", "Paiement", "Total ticket", "Encaissé à"];
    const rows = [header.join(";")];
    for (const order of orders) {
      if (siteFilter && order.siteId !== siteFilter) continue;
      for (const item of order.items) {
        rows.push(
          [
            order.serviceDate,
            siteName.get(order.siteId) ?? "",
            order.number,
            order.kind === "takeaway" ? "À emporter" : "Table",
            order.tableLabel ?? "",
            item.name,
            item.quantity,
            item.unitPrice.toFixed(2),
            (item.unitPrice * item.quantity).toFixed(2),
            order.paymentMethod ? PAYMENT_METHOD_LABELS[order.paymentMethod] : "",
            order.total.toFixed(2),
            order.paidAt ?? "",
          ]
            .map(csvCell)
            .join(";")
        );
      }
    }

    return new Response(`\uFEFF${rows.join("\r\n")}`, {
      headers: {
        "content-type": "text/csv; charset=utf-8",
        "content-disposition": `attachment; filename="ventes-${from}-${today}.csv"`,
      },
    });
  });
}

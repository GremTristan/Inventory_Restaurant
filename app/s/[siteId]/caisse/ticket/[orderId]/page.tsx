import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { PrintButton } from "@/components/staff/print-button";
import { formatTime } from "@/lib/dates";
import { formatMoney } from "@/lib/money";
import { getOrder } from "@/lib/order-store";
import { pageSite } from "@/lib/page-guards";
import { PAYMENT_METHOD_LABELS } from "@/types";

export const metadata: Metadata = { title: "Ticket" };

export default async function TicketPage({ params }: { params: Promise<{ siteId: string; orderId: string }> }) {
  const { siteId, orderId } = await params;
  const { tenant, site } = await pageSite(siteId, ["waiter"]);
  const order = await getOrder(tenant.id, orderId);
  if (!order || order.siteId !== site.id) notFound();

  return (
    <div className="mx-auto max-w-sm">
      <div className="no-print mb-4 flex items-center justify-between">
        <Link href={`/s/${site.id}/caisse`} className="min-h-11 inline-flex items-center text-sm font-medium text-accent">
          ← Retour à la caisse
        </Link>
        <PrintButton />
      </div>
      <article className="rounded-card bg-card p-6 font-mono text-sm shadow-sm print:shadow-none">
        <header className="text-center">
          <p className="text-lg font-bold">{tenant.legalName ?? tenant.name}</p>
          <p className="text-muted-foreground">{site.name}</p>
          {tenant.legalAddress && <p className="whitespace-pre-line text-xs text-muted-foreground">{tenant.legalAddress}</p>}
        </header>
        <hr className="my-4 border-dashed border-border" />
        <p className="flex justify-between">
          <span>Ticket n° {order.number}</span>
          <span>
            {order.serviceDate} {order.paidAt ? formatTime(order.paidAt) : ""}
          </span>
        </p>
        <p className="text-muted-foreground">
          {order.kind === "takeaway" ? "À emporter" : `Table ${order.tableLabel ?? ""}`}
        </p>
        <hr className="my-4 border-dashed border-border" />
        <ul className="space-y-1">
          {order.items.map((item) => (
            <li key={item.id} className="flex justify-between gap-2">
              <span>
                {item.quantity} × {item.name}
              </span>
              <span className="tabular-nums">{formatMoney(item.unitPrice * item.quantity, tenant.currency)}</span>
            </li>
          ))}
        </ul>
        <hr className="my-4 border-dashed border-border" />
        <p className="flex justify-between text-lg font-bold">
          <span>TOTAL</span>
          <span className="tabular-nums">{formatMoney(order.total, tenant.currency)}</span>
        </p>
        {order.paymentMethod && (
          <p className="flex justify-between text-muted-foreground">
            <span>Réglé par</span>
            <span>{PAYMENT_METHOD_LABELS[order.paymentMethod]}</span>
          </p>
        )}
        <p className="mt-6 text-center text-xs text-muted-foreground">Merci de votre visite !</p>
      </article>
    </div>
  );
}

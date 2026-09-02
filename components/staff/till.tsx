"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Banknote, CheckCircle2, CreditCard, Receipt, ShoppingBag, Smartphone, Utensils } from "lucide-react";
import { ConfirmButton } from "@/components/ui/confirm-button";
import { OfflineBanner, useOnline, useToast } from "@/components/ui/toast";
import { useOfflineQueue } from "@/lib/offline-queue";
import { formatMoney } from "@/lib/money";
import { closeDayAction } from "@/lib/till-actions";
import { summarizePaid } from "@/lib/order-store-shared";
import { PAYMENT_METHOD_LABELS, type Order, type PaymentMethod } from "@/types";
import { cn } from "@/lib/utils";
import { useOrdersFeed } from "./use-orders-feed";

const METHODS: { method: PaymentMethod; icon: typeof CreditCard; tone: string }[] = [
  { method: "card", icon: CreditCard, tone: "bg-[var(--metric-card-payment)]" },
  { method: "cash", icon: Banknote, tone: "bg-[var(--metric-cash-payment)]" },
  { method: "twint", icon: Smartphone, tone: "bg-foreground" },
];

export function Till({
  siteId,
  currency,
  initialActive,
  initialPaidToday,
  preselectOrderId,
  dayClosed,
}: {
  siteId: string;
  currency: string;
  initialActive: Order[];
  initialPaidToday: Order[];
  preselectOrderId: string | null;
  dayClosed: boolean;
}) {
  const { active, paidToday, setFeed, refresh } = useOrdersFeed(siteId, { active: initialActive, paidToday: initialPaidToday });
  const { pending, enqueue } = useOfflineQueue(`orders.${siteId}`, refresh);
  const toast = useToast();
  const online = useOnline();
  const [selectedId, setSelectedId] = useState<string | null>(preselectOrderId);
  const [justPaid, setJustPaid] = useState<Order | null>(null);

  const payable = useMemo(
    () => [...active].sort((a, b) => (a.status === "served" ? -1 : 1) - (b.status === "served" ? -1 : 1)),
    [active]
  );
  // No explicit choice → the first payable order is selected, unless we're
  // showing the "just paid" confirmation.
  const effectiveId = selectedId ?? (!justPaid && payable.length > 0 ? payable[0].id : null);
  const selected = payable.find((o) => o.id === effectiveId) ?? null;

  const pay = async (order: Order, method: PaymentMethod) => {
    const paid: Order = { ...order, status: "paid", paymentMethod: method, paidAt: new Date().toISOString() };
    setFeed((f) => ({ active: f.active.filter((o) => o.id !== order.id), paidToday: [paid, ...f.paidToday] }));
    setJustPaid(paid);
    setSelectedId(null);
    toast(online ? "success" : "offline", `n° ${order.number} encaissée — ${PAYMENT_METHOD_LABELS[method]}`);
    const result = await enqueue({
      url: `/api/orders/${siteId}`,
      method: "PATCH",
      body: { action: "pay", orderId: order.id, method },
    });
    if (result.failed.length > 0) {
      toast("error", "L’encaissement n’a pas été enregistré (commande déjà clôturée ?)");
      void refresh();
    }
  };

  const totals = summarizePaid(paidToday);

  return (
    <div className="flex flex-col gap-5">
      <OfflineBanner pending={pending} />
      <div className="flex flex-col gap-5 lg:flex-row">
        {/* Orders to collect */}
        <section className="flex w-full flex-col gap-2 lg:w-80 lg:shrink-0">
          <h1 className="text-[17px] font-bold tracking-tight text-foreground">À encaisser ({payable.length})</h1>
          {payable.length === 0 && (
            <p className="rounded-lg border border-border bg-card p-6 text-center text-sm text-muted-foreground shadow-sm">
              Toutes les commandes sont encaissées.
            </p>
          )}
          {payable.map((order) => (
            <button
              key={order.id}
              type="button"
              onClick={() => {
                setSelectedId(order.id);
                setJustPaid(null);
              }}
              className={cn(
                "flex min-h-12 items-center justify-between rounded-lg border border-border bg-card px-3 py-2.5 text-left shadow-sm",
                effectiveId === order.id ? "border-accent" : "border-transparent"
              )}
            >
              <span className="flex items-center gap-2">
                <span className="text-[17px] font-bold tracking-tight tabular-nums">n° {order.number}</span>
                <span className="flex items-center gap-1 text-sm text-muted-foreground">
                  {order.kind === "takeaway" ? <ShoppingBag className="h-4 w-4" /> : <Utensils className="h-4 w-4" />}
                  {order.kind === "takeaway" ? "Emporter" : order.tableLabel ? `T. ${order.tableLabel}` : "Table"}
                </span>
              </span>
              <span className="text-lg font-bold tabular-nums">{formatMoney(order.total, currency)}</span>
            </button>
          ))}
        </section>

        {/* Payment panel */}
        <section className="flex-1">
          {justPaid && !selected ? (
            <div className="flex flex-col items-center gap-3 rounded-lg border border-border bg-card p-5 text-center shadow-sm">
              <CheckCircle2 className="h-10 w-10 text-success" />
              <p className="text-[17px] font-bold tracking-tight text-foreground">Commande n° {justPaid.number} encaissée</p>
              <p className="text-lg text-muted-foreground">
                {formatMoney(justPaid.total, currency)} · {justPaid.paymentMethod ? PAYMENT_METHOD_LABELS[justPaid.paymentMethod] : ""}
              </p>
              <div className="flex flex-wrap justify-center gap-3">
                <Link
                  href={`/s/${siteId}/caisse/ticket/${justPaid.id}`}
                  className="flex min-h-10 items-center gap-1.5 rounded-md bg-muted px-4 text-[13px] font-semibold text-foreground"
                >
                  <Receipt className="h-5 w-5" /> Ticket
                </Link>
                {payable.length > 0 && (
                  <button
                    type="button"
                    onClick={() => {
                      setJustPaid(null);
                      setSelectedId(payable[0].id);
                    }}
                    className="flex min-h-10 items-center rounded-md bg-accent px-4 text-[13px] font-semibold text-accent-foreground"
                  >
                    Commande suivante
                  </button>
                )}
              </div>
            </div>
          ) : selected ? (
            <div className="rounded-lg border border-border bg-card p-4">
              <header className="flex items-center justify-between">
                <span className="text-[17px] font-bold tracking-tight">Commande n° {selected.number}</span>
                <span className="text-sm text-muted-foreground">
                  {selected.kind === "takeaway" ? "À emporter" : selected.tableLabel ? `Table ${selected.tableLabel}` : "Table"}
                </span>
              </header>
              <ul className="my-4 divide-y divide-border">
                {selected.items.map((item) => (
                  <li key={item.id} className="flex justify-between py-2 text-base">
                    <span>
                      <span className="font-semibold">{item.quantity}×</span> {item.name}
                    </span>
                    <span className="tabular-nums">{formatMoney(item.unitPrice * item.quantity, currency)}</span>
                  </li>
                ))}
              </ul>
              <p className="flex items-center justify-between text-[22px] font-bold tracking-tight">
                <span>Total</span>
                <span className="tabular-nums">{formatMoney(selected.total, currency)}</span>
              </p>
              <p className="mb-3 mt-6 text-sm font-medium text-muted-foreground">Le client paie par</p>
              <div className="grid grid-cols-3 gap-3">
                {METHODS.map(({ method, icon: Icon, tone }) => (
                  <button
                    key={method}
                    type="button"
                    onClick={() => pay(selected, method)}
                    className={cn(
                      "flex min-h-14 flex-col items-center justify-center gap-1.5 rounded-lg text-[13px] font-bold tracking-tight lg:min-h-20 lg:text-[15px] text-white shadow-sm transition-transform active:scale-[0.96] select-none touch-manipulation",
                      tone
                    )}
                  >
                    <Icon className="h-5 w-5 lg:h-6 lg:w-6" />
                    {PAYMENT_METHOD_LABELS[method]}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div className="rounded-lg border border-border bg-card p-5 text-center text-[13px] text-muted-foreground">
              Sélectionnez une commande à gauche.
            </div>
          )}

          {/* Day summary */}
          <div className="mt-4 rounded-lg border border-border bg-card p-4">
            <div className="flex flex-wrap items-end justify-between gap-3">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Aujourd’hui</p>
                <p className="text-[22px] font-bold tracking-tight tabular-nums">{formatMoney(totals.total, currency)}</p>
                <p className="text-sm text-muted-foreground">
                  {totals.count} ticket{totals.count > 1 ? "s" : ""} · Carte {formatMoney(totals.byMethod.card, currency)} · Espèces{" "}
                  {formatMoney(totals.byMethod.cash, currency)} · TWINT {formatMoney(totals.byMethod.twint, currency)}
                </p>
              </div>
              <form action={closeDayAction} className="flex items-center gap-3">
                <input type="hidden" name="siteId" value={siteId} />
                {dayClosed && <span className="text-sm font-semibold text-success">Journée clôturée ✓</span>}
                <ConfirmButton variant={dayClosed ? "secondary" : "primary"} size="lg" confirmLabel="Confirmer la clôture">
                  {dayClosed ? "Mettre à jour la clôture" : "Clôturer la journée"}
                </ConfirmButton>
              </form>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}

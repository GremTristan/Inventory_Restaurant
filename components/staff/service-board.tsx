"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Check, ChefHat, Plus, ShoppingBag, Utensils, Wallet, X } from "lucide-react";
import { OfflineBanner, useOnline, useToast } from "@/components/ui/toast";
import { useOfflineQueue } from "@/lib/offline-queue";
import { formatMoney } from "@/lib/money";
import { formatTime } from "@/lib/dates";
import type { Order } from "@/types";
import { cn } from "@/lib/utils";
import { useOrdersFeed } from "./use-orders-feed";

function OrderLabel({ order }: { order: Order }) {
  return (
    <span className="flex items-center gap-2">
      <span className="text-2xl font-bold tabular-nums text-foreground">n° {order.number}</span>
      <span className="flex items-center gap-1 rounded-pill bg-muted px-3 py-1 text-sm font-semibold text-foreground">
        {order.kind === "takeaway" ? <ShoppingBag className="h-4 w-4" /> : <Utensils className="h-4 w-4" />}
        {order.kind === "takeaway" ? "À emporter" : order.tableLabel ? `Table ${order.tableLabel}` : "Table"}
      </span>
    </span>
  );
}

function Column({
  title,
  orders,
  tone,
  currency,
  children,
}: {
  title: string;
  orders: Order[];
  tone: string;
  currency: string;
  children: (order: Order) => React.ReactNode;
}) {
  return (
    <section className="flex min-w-0 flex-1 flex-col gap-3">
      <h2 className={cn("flex items-center gap-2 text-lg font-bold", tone)}>
        {title}
        <span className="rounded-pill bg-card px-2.5 py-0.5 text-sm shadow-sm">{orders.length}</span>
      </h2>
      {orders.length === 0 && <p className="rounded-card bg-card/60 p-4 text-sm text-muted-foreground">—</p>}
      {orders.map((order) => (
        <article key={order.id} className="rounded-card bg-card p-4 shadow-sm">
          <header className="flex items-start justify-between gap-2">
            <OrderLabel order={order} />
            <span className="text-sm text-muted-foreground">{formatTime(order.createdAt)}</span>
          </header>
          <p className="mt-2 text-sm text-muted-foreground">{order.items.map((i) => `${i.quantity}× ${i.name}`).join(", ")}</p>
          <p className="mt-1 text-base font-semibold text-foreground">{formatMoney(order.total, currency)}</p>
          <div className="mt-3 flex flex-wrap gap-2">{children(order)}</div>
        </article>
      ))}
    </section>
  );
}

export function ServiceBoard({
  siteId,
  currency,
  initialActive,
}: {
  siteId: string;
  currency: string;
  initialActive: Order[];
}) {
  const { active, setFeed, refresh } = useOrdersFeed(siteId, { active: initialActive, paidToday: [] });
  const { pending, enqueue } = useOfflineQueue(`orders.${siteId}`, refresh);
  const toast = useToast();
  const online = useOnline();
  const [confirmCancel, setConfirmCancel] = useState<string | null>(null);

  useEffect(() => {
    if (!confirmCancel) return;
    const timer = setTimeout(() => setConfirmCancel(null), 4000);
    return () => clearTimeout(timer);
  }, [confirmCancel]);

  const serve = async (order: Order) => {
    setFeed((f) => ({ ...f, active: f.active.map((o) => (o.id === order.id ? { ...o, status: "served" } : o)) }));
    toast(online ? "success" : "offline", `Commande n° ${order.number} servie`);
    await enqueue({ url: `/api/orders/${siteId}`, method: "PATCH", body: { action: "serve", orderId: order.id } });
  };

  const cancel = async (order: Order) => {
    setConfirmCancel(null);
    setFeed((f) => ({ ...f, active: f.active.filter((o) => o.id !== order.id) }));
    toast("success", `Commande n° ${order.number} annulée`);
    await enqueue({ url: `/api/orders/${siteId}`, method: "PATCH", body: { action: "cancel", orderId: order.id } });
  };

  const inKitchen = active.filter((o) => o.status === "sent" || o.status === "open");
  const ready = active.filter((o) => o.status === "ready");
  const served = active.filter((o) => o.status === "served");

  return (
    <div className="flex flex-col gap-4">
      <OfflineBanner pending={pending} />
      <Link
        href={`/s/${siteId}/commande`}
        className="flex min-h-[4.5rem] items-center justify-center gap-3 rounded-card bg-accent text-xl font-bold text-accent-foreground shadow-sm transition-transform active:scale-[0.98]"
      >
        <Plus className="h-7 w-7" /> Nouvelle commande
      </Link>

      {active.length === 0 ? (
        <div className="rounded-card bg-card p-10 text-center shadow-sm">
          <Utensils className="mx-auto h-10 w-10 text-muted-foreground" />
          <p className="mt-3 text-lg font-semibold text-foreground">Aucune commande en cours</p>
          <p className="text-sm text-muted-foreground">Touchez « Nouvelle commande » pour démarrer le service.</p>
        </div>
      ) : (
        <div className="flex flex-col gap-6 lg:flex-row">
          <Column title="En cuisine" orders={inKitchen} tone="text-warning" currency={currency}>
            {(order) => (
              <>
                <Link
                  href={`/s/${siteId}/commande?commande=${order.id}`}
                  className="flex min-h-12 items-center gap-2 rounded-pill bg-muted px-4 text-sm font-semibold text-foreground"
                >
                  <Plus className="h-4 w-4" /> Ajouter
                </Link>
                <button
                  type="button"
                  onClick={() => (confirmCancel === order.id ? cancel(order) : setConfirmCancel(order.id))}
                  className={cn(
                    "flex min-h-12 items-center gap-2 rounded-pill px-4 text-sm font-semibold",
                    confirmCancel === order.id ? "bg-destructive text-destructive-foreground" : "text-destructive hover:bg-destructive/10"
                  )}
                >
                  <X className="h-4 w-4" /> {confirmCancel === order.id ? "Confirmer l’annulation" : "Annuler"}
                </button>
                <span className="ml-auto flex items-center gap-1 text-sm text-muted-foreground">
                  <ChefHat className="h-4 w-4" /> en préparation
                </span>
              </>
            )}
          </Column>
          <Column title="Prêtes — à servir" orders={ready} tone="text-success" currency={currency}>
            {(order) => (
              <button
                type="button"
                onClick={() => serve(order)}
                className="flex min-h-14 w-full items-center justify-center gap-2 rounded-control bg-success text-lg font-bold text-success-foreground active:scale-[0.98]"
              >
                <Check className="h-6 w-6" /> Servie
              </button>
            )}
          </Column>
          <Column title="À encaisser" orders={served} tone="text-accent" currency={currency}>
            {(order) => (
              <>
                <Link
                  href={`/s/${siteId}/caisse?commande=${order.id}`}
                  className="flex min-h-14 flex-1 items-center justify-center gap-2 rounded-control bg-accent text-lg font-bold text-accent-foreground active:scale-[0.98]"
                >
                  <Wallet className="h-6 w-6" /> Encaisser
                </Link>
                <Link
                  href={`/s/${siteId}/commande?commande=${order.id}`}
                  className="flex min-h-14 items-center gap-2 rounded-control bg-muted px-4 text-sm font-semibold text-foreground"
                >
                  <Plus className="h-4 w-4" /> Ajouter
                </Link>
              </>
            )}
          </Column>
        </div>
      )}
    </div>
  );
}

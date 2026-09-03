"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Minus, Plus, Send, ShoppingBag, Trash2, Utensils } from "lucide-react";
import { OfflineBanner, useOnline, useToast } from "@/components/ui/toast";
import { newClientId, useOfflineQueue } from "@/lib/offline-queue";
import { formatMoney } from "@/lib/money";
import { MENU_CATEGORY_LABELS, MENU_CATEGORY_ORDER, type MenuCategory, type MenuItem, type Order, type OrderKind } from "@/types";
import { cn } from "@/lib/utils";

interface CartLine {
  menuItemId: string;
  name: string;
  price: number;
  quantity: number;
  note: string;
}

export function OrderComposer({
  siteId,
  menu,
  currency,
  appendTo,
}: {
  siteId: string;
  menu: MenuItem[];
  currency: string;
  // When set, lines are added to this existing (unpaid) order instead.
  appendTo: Order | null;
}) {
  const router = useRouter();
  const toast = useToast();
  const online = useOnline();
  const { pending, enqueue } = useOfflineQueue(`orders.${siteId}`);

  const categories = useMemo(
    () => MENU_CATEGORY_ORDER.filter((c) => menu.some((m) => m.category === c)),
    [menu]
  );
  const [category, setCategory] = useState<MenuCategory>(categories[0] ?? "salee");
  const [cart, setCart] = useState<CartLine[]>([]);
  const [kind, setKind] = useState<OrderKind>(appendTo?.kind ?? "table");
  const [tableLabel, setTableLabel] = useState(appendTo?.tableLabel ?? "");
  const [noteFor, setNoteFor] = useState<string | null>(null);
  const [sending, setSending] = useState(false);

  const total = cart.reduce((sum, l) => sum + l.price * l.quantity, 0);
  const count = cart.reduce((sum, l) => sum + l.quantity, 0);

  const add = (item: MenuItem) => {
    setCart((current) => {
      const existing = current.find((l) => l.menuItemId === item.id && l.note === "");
      if (existing) return current.map((l) => (l === existing ? { ...l, quantity: l.quantity + 1 } : l));
      return [...current, { menuItemId: item.id, name: item.name, price: item.price, quantity: 1, note: "" }];
    });
  };

  const changeQty = (index: number, delta: number) => {
    setCart((current) =>
      current
        .map((l, i) => (i === index ? { ...l, quantity: l.quantity + delta } : l))
        .filter((l) => l.quantity > 0)
    );
  };

  const send = async () => {
    if (cart.length === 0 || sending) return;
    if (kind === "table" && !appendTo && !tableLabel.trim()) {
      toast("error", "Indiquez le numéro de table (ou choisissez « À emporter »)");
      return;
    }
    setSending(true);
    const lines = cart.map((l) => ({ menuItemId: l.menuItemId, quantity: l.quantity, note: l.note || undefined }));
    const request = appendTo
      ? { url: `/api/orders/${siteId}`, method: "PATCH" as const, body: { action: "append", orderId: appendTo.id, lines } }
      : {
          url: `/api/orders/${siteId}`,
          method: "POST" as const,
          body: { kind, tableLabel: kind === "table" ? tableLabel.trim() : null, lines, clientId: newClientId() },
        };
    const result = await enqueue(request);
    if (result.failed.length > 0) {
      toast("error", "La cuisine n’a pas pu recevoir la commande. Vérifiez qu’elle n’est pas déjà encaissée.");
      setSending(false);
      return;
    }
    toast(online && result.sent > 0 ? "success" : "offline", appendTo ? `Ajout envoyé en cuisine` : "Commande envoyée en cuisine");
    router.push(`/s/${siteId}/service`);
  };

  const visible = menu.filter((m) => m.category === category);
  const quantityByItem = new Map<string, number>();
  for (const line of cart) quantityByItem.set(line.menuItemId, (quantityByItem.get(line.menuItemId) ?? 0) + line.quantity);

  return (
    <div className="flex flex-col gap-4 lg:h-[calc(100vh-7rem)] lg:flex-row">
      <OfflineBanner pending={pending} />
      {/* Product picker */}
      <section className="flex min-w-0 flex-1 flex-col gap-4">
        <div className="flex items-center justify-between gap-4">
          <h1 className="text-[17px] font-bold tracking-tight text-foreground">
            {appendTo ? `Ajouter à la commande n° ${appendTo.number}` : "Nouvelle commande"}
          </h1>
        </div>
        <div className="flex gap-2 overflow-x-auto pb-1">
          {categories.map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => setCategory(c)}
              className={cn(
                "min-h-9 shrink-0 rounded-md px-3.5 text-[13px] font-semibold transition-colors",
                category === c ? "bg-foreground text-background" : "border border-border bg-card text-foreground hover:bg-muted"
              )}
            >
              {MENU_CATEGORY_LABELS[c]}
            </button>
          ))}
        </div>
        {menu.length === 0 ? (
          <p className="rounded-lg border border-border bg-card p-5 text-center text-[13px] text-muted-foreground">
            La carte est vide. La direction peut ajouter des produits depuis « Menu ».
          </p>
        ) : (
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 xl:grid-cols-4">
            {visible.map((item) => {
              const qty = quantityByItem.get(item.id) ?? 0;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => add(item)}
                  className={cn(
                    "relative flex min-h-16 flex-col items-start justify-between rounded-lg border border-border bg-card p-2.5 text-left lg:min-h-20 shadow-sm transition-transform active:scale-[0.96] select-none touch-manipulation",
                    qty > 0 ? "border-accent" : "border-transparent hover:border-border"
                  )}
                >
                  <span className="text-base font-semibold leading-tight text-foreground">{item.name}</span>
                  <span className="text-sm font-medium text-muted-foreground">{formatMoney(item.price, currency)}</span>
                  {qty > 0 && (
                    <span className="absolute right-2 top-2 flex h-8 min-w-8 items-center justify-center rounded-md bg-accent px-2 text-base font-bold text-accent-foreground">
                      {qty}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        )}
      </section>

      {/* Cart */}
      <aside className="flex w-full flex-col rounded-lg border border-border bg-card lg:w-96 lg:shrink-0">
        {!appendTo && (
          <div className="flex flex-col gap-4 border-b border-border p-4">
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setKind("table")}
                className={cn(
                  "flex min-h-10 items-center justify-center gap-1.5 rounded-control text-[13px] font-semibold",
                  kind === "table" ? "bg-foreground text-background" : "bg-muted text-foreground"
                )}
              >
                <Utensils className="h-5 w-5" /> Table
              </button>
              <button
                type="button"
                onClick={() => setKind("takeaway")}
                className={cn(
                  "flex min-h-10 items-center justify-center gap-1.5 rounded-control text-[13px] font-semibold",
                  kind === "takeaway" ? "bg-foreground text-background" : "bg-muted text-foreground"
                )}
              >
                <ShoppingBag className="h-5 w-5" /> À emporter
              </button>
            </div>
            {kind === "table" && (
              <label className="flex items-center gap-4">
                <span className="text-sm font-medium text-foreground">Table n°</span>
                <input
                  value={tableLabel}
                  onChange={(e) => setTableLabel(e.target.value.slice(0, 6))}
                  inputMode="numeric"
                  placeholder="12"
                  className="min-h-10 w-full rounded-control bg-muted px-3 text-center text-[17px] font-bold tracking-tight text-foreground focus:bg-card focus:outline-none focus:ring-2 focus:ring-accent/40"
                />
              </label>
            )}
          </div>
        )}
        <ul className="flex-1 overflow-y-auto p-2">
          {cart.length === 0 && (
            <li className="p-6 text-center text-sm text-muted-foreground">Touchez un produit pour l’ajouter.</li>
          )}
          {cart.map((line, index) => (
            <li key={`${line.menuItemId}-${index}`} className="rounded-control px-2 py-2 hover:bg-muted/50">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setNoteFor(noteFor === `${index}` ? null : `${index}`)}
                  className="min-w-0 flex-1 text-left"
                >
                  <span className="block truncate text-base font-semibold text-foreground">{line.name}</span>
                  <span className="block text-xs text-muted-foreground">
                    {line.note ? <span className="italic text-warning">{line.note}</span> : "Ajouter une précision…"}
                  </span>
                </button>
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => changeQty(index, -1)}
                    aria-label="Retirer un"
                    className="flex h-11 w-11 items-center justify-center rounded-md bg-muted text-foreground active:scale-95"
                  >
                    {line.quantity === 1 ? <Trash2 className="h-5 w-5" /> : <Minus className="h-5 w-5" />}
                  </button>
                  <span className="w-8 text-center text-lg font-bold tabular-nums">{line.quantity}</span>
                  <button
                    type="button"
                    onClick={() => changeQty(index, 1)}
                    aria-label="Ajouter un"
                    className="flex h-11 w-11 items-center justify-center rounded-md bg-muted text-foreground active:scale-95"
                  >
                    <Plus className="h-5 w-5" />
                  </button>
                </div>
              </div>
              {noteFor === `${index}` && (
                <div className="mt-2 flex flex-wrap gap-2">
                  {["Sans gluten", "Sans lactose", "Bien cuite", "Peu cuite", "Sans sucre"].map((preset) => (
                    <button
                      key={preset}
                      type="button"
                      onClick={() => {
                        setCart((c) => c.map((l, i) => (i === index ? { ...l, note: l.note === preset ? "" : preset } : l)));
                      }}
                      className={cn(
                        "min-h-10 rounded-md px-3 text-sm font-medium",
                        line.note === preset ? "bg-warning text-warning-foreground" : "bg-muted text-foreground"
                      )}
                    >
                      {preset}
                    </button>
                  ))}
                  <input
                    value={line.note}
                    onChange={(e) => setCart((c) => c.map((l, i) => (i === index ? { ...l, note: e.target.value.slice(0, 60) } : l)))}
                    placeholder="Autre précision"
                    className="min-h-10 flex-1 rounded-control bg-muted px-3 text-sm focus:outline-none focus:ring-2 focus:ring-accent/40"
                  />
                </div>
              )}
            </li>
          ))}
        </ul>
        <div className="border-t border-border p-3">
          <button
            type="button"
            onClick={send}
            disabled={cart.length === 0 || sending}
            className="flex h-11 w-full items-center justify-between rounded-md bg-foreground px-4 text-background hover:bg-foreground/90 disabled:opacity-40 select-none touch-manipulation"
          >
            <span className="flex items-center gap-2 text-lg font-bold">
              <Send className="h-6 w-6" /> {appendTo ? "Ajouter et envoyer" : "Envoyer en cuisine"}
            </span>
            <span className="text-right">
              <span className="block text-[17px] font-bold tracking-tight tabular-nums">{formatMoney(total, currency)}</span>
              <span className="block text-xs opacity-80">{count} article{count > 1 ? "s" : ""}</span>
            </span>
          </button>
        </div>
      </aside>
    </div>
  );
}

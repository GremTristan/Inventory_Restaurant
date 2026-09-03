"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Minus, Plus, Search, Send, ShoppingBag, Trash2, Utensils } from "lucide-react";
import { OfflineBanner, useOnline, useToast } from "@/components/ui/toast";
import { newClientId, useOfflineQueue } from "@/lib/offline-queue";
import { formatMoney } from "@/lib/money";
import { familiesPresent, groupMenuByFamily, matchesQuery, menuFamily, MENU_FAMILY_LABELS, type MenuFamily } from "@/lib/menu-taxonomy";
import { type MenuItem, type Order, type OrderKind } from "@/types";
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

  const families = useMemo(() => familiesPresent(menu), [menu]);
  const [family, setFamily] = useState<MenuFamily | "all">(families[0] ?? "all");
  const [query, setQuery] = useState("");
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

  const visible = useMemo(() => {
    const searched = menu.filter((m) => matchesQuery(m.name, query));
    if (query.trim()) return searched;
    if (family === "all") return searched;
    return searched.filter((m) => menuFamily(m) === family);
  }, [menu, query, family]);
  const grouped = useMemo(() => groupMenuByFamily(visible), [visible]);
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
        <label className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Chercher un plat, une boisson…"
            className="min-h-11 w-full rounded-md border border-border bg-card pl-10 pr-3 text-[15px] focus:outline-none focus:ring-2 focus:ring-accent/40"
          />
        </label>
        <div className="flex gap-2 overflow-x-auto pb-1">
          <button
            type="button"
            onClick={() => setFamily("all")}
            className={cn(
              "min-h-9 shrink-0 rounded-md px-3.5 text-[13px] font-semibold transition-colors",
              family === "all" && !query.trim() ? "bg-foreground text-background" : "border border-border bg-card text-foreground hover:bg-muted"
            )}
          >
            Toute la carte
          </button>
          {families.map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => {
                setFamily(c);
                setQuery("");
              }}
              className={cn(
                "min-h-9 shrink-0 rounded-md px-3.5 text-[13px] font-semibold transition-colors",
                family === c && !query.trim() ? "bg-foreground text-background" : "border border-border bg-card text-foreground hover:bg-muted"
              )}
            >
              {MENU_FAMILY_LABELS[c]}
            </button>
          ))}
        </div>
        {menu.length === 0 ? (
          <p className="rounded-lg border border-border bg-card p-5 text-center text-[13px] text-muted-foreground">
            La carte est vide. La direction peut ajouter des produits depuis « Menu ».
          </p>
        ) : visible.length === 0 ? (
          <p className="rounded-lg border border-dashed border-border bg-card p-5 text-center text-[13px] text-muted-foreground">
            Aucun produit pour cette recherche.
          </p>
        ) : (
          <div className="flex flex-col gap-5 overflow-y-auto lg:min-h-0 lg:flex-1">
            {grouped.map((group) => (
              <section key={group.family}>
                <h2 className="mb-2 text-[12px] font-semibold uppercase tracking-[0.04em] text-muted-foreground">
                  {group.label}
                  <span className="ml-2 font-mono tabular-nums">{group.items.length}</span>
                </h2>
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 xl:grid-cols-3">
                  {group.items.map((item) => {
                    const qty = quantityByItem.get(item.id) ?? 0;
                    return (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => add(item)}
                        className={cn(
                          "relative flex min-h-12 items-center justify-between gap-2 rounded-lg border bg-card px-3 py-2.5 text-left shadow-sm transition-transform active:scale-[0.98] select-none touch-manipulation",
                          qty > 0 ? "border-accent" : "border-border hover:bg-muted/50"
                        )}
                      >
                        <span className="min-w-0 truncate text-[14px] font-semibold leading-tight text-foreground">{item.name}</span>
                        <span className="shrink-0 text-[13px] font-medium tabular-nums text-muted-foreground">
                          {formatMoney(item.price, currency)}
                        </span>
                        {qty > 0 && (
                          <span className="absolute -right-1.5 -top-1.5 flex h-6 min-w-6 items-center justify-center rounded-md bg-accent px-1.5 text-[12px] font-bold text-accent-foreground">
                            {qty}
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </section>
            ))}
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

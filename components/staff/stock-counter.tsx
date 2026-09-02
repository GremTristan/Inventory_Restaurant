"use client";

import { useMemo, useState } from "react";
import { AlertTriangle, CheckCircle2, ClipboardCheck, Minus, Plus, Search } from "lucide-react";
import { OfflineBanner, useOnline, useToast } from "@/components/ui/toast";
import { useOfflineQueue } from "@/lib/offline-queue";
import { CATEGORY_LABELS, CATEGORY_ORDER, type StaffInventoryItem } from "@/types";
import { cn } from "@/lib/utils";

function isLow(item: StaffInventoryItem) {
  return item.lowStockThreshold !== null && item.quantity <= item.lowStockThreshold;
}

function formatQty(value: number) {
  return Number.isInteger(value) ? String(value) : value.toFixed(1).replace(/\.0$/, "");
}

export function StockCounter({
  siteId,
  initialItems,
  inventoryDue,
}: {
  siteId: string;
  initialItems: StaffInventoryItem[];
  inventoryDue: boolean;
}) {
  const [items, setItems] = useState(initialItems);
  const [query, setQuery] = useState("");
  const [editing, setEditing] = useState<string | null>(null);
  const [due, setDue] = useState(inventoryDue);
  const toast = useToast();
  const online = useOnline();
  const { pending, enqueue } = useOfflineQueue(`stock.${siteId}`);

  const low = useMemo(() => items.filter(isLow), [items]);
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return q ? items.filter((i) => i.name.toLowerCase().includes(q)) : items;
  }, [items, query]);

  const setQuantity = async (item: StaffInventoryItem, quantity: number) => {
    const clean = Math.max(0, Math.round(quantity * 10) / 10);
    setItems((current) => current.map((i) => (i.id === item.id ? { ...i, quantity: clean } : i)));
    await enqueue({ url: `/api/stock/${siteId}`, method: "POST", body: { action: "set", itemId: item.id, quantity: clean } });
  };

  const markInventoryDone = async () => {
    setDue(false);
    toast(online ? "success" : "offline", "Inventaire du mois enregistré");
    await enqueue({ url: `/api/stock/${siteId}`, method: "POST", body: { action: "inventory-done" } });
  };

  return (
    <div className="flex flex-col gap-4">
      <OfflineBanner pending={pending} />

      {low.length > 0 && (
        <section className="rounded-card border-2 border-destructive/40 bg-card p-4 shadow-sm">
          <h2 className="flex items-center gap-2 text-lg font-bold text-destructive">
            <AlertTriangle className="h-5 w-5" /> À commander ({low.length})
          </h2>
          <ul className="mt-2 flex flex-wrap gap-2">
            {low.map((item) => (
              <li key={item.id} className="rounded-pill bg-destructive/10 px-3 py-1.5 text-sm font-semibold text-destructive">
                {item.name} · {formatQty(item.quantity)} {item.unit}
              </li>
            ))}
          </ul>
        </section>
      )}

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <label className="relative flex-1">
          <Search className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Chercher un article…"
            className="min-h-14 w-full rounded-pill bg-card pl-12 pr-4 text-base shadow-sm focus:outline-none focus:ring-2 focus:ring-accent/40"
          />
        </label>
        {due ? (
          <button
            type="button"
            onClick={markInventoryDone}
            className="flex min-h-14 items-center justify-center gap-2 rounded-pill bg-warning px-5 text-base font-semibold text-warning-foreground"
          >
            <ClipboardCheck className="h-5 w-5" /> Inventaire du mois : marquer comme fait
          </button>
        ) : (
          <span className="flex min-h-14 items-center gap-2 rounded-pill bg-card px-5 text-sm font-medium text-success shadow-sm">
            <CheckCircle2 className="h-5 w-5" /> Inventaire du mois fait
          </span>
        )}
      </div>

      {items.length === 0 && (
        <p className="rounded-card bg-card p-8 text-center text-muted-foreground shadow-sm">
          Aucun article de stock. La direction peut en ajouter depuis « Stock ».
        </p>
      )}

      {CATEGORY_ORDER.map((category) => {
        const group = filtered.filter((i) => i.category === category);
        if (group.length === 0) return null;
        return (
          <section key={category}>
            <h2 className="mb-2 text-base font-bold text-muted-foreground">{CATEGORY_LABELS[category]}</h2>
            <ul className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
              {group.map((item) => {
                const lowItem = isLow(item);
                return (
                  <li
                    key={item.id}
                    className={cn(
                      "flex items-center gap-3 rounded-card border-2 bg-card p-3 shadow-sm",
                      lowItem ? "border-destructive/50" : "border-transparent"
                    )}
                  >
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-base font-semibold text-foreground">{item.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {item.unit}
                        {item.lowStockThreshold !== null && ` · alerte sous ${formatQty(item.lowStockThreshold)}`}
                      </p>
                    </div>
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        aria-label="Moins un"
                        onClick={() => setQuantity(item, item.quantity - 1)}
                        className="flex h-12 w-12 items-center justify-center rounded-pill bg-muted text-foreground active:scale-95"
                      >
                        <Minus className="h-5 w-5" />
                      </button>
                      {editing === item.id ? (
                        <input
                          autoFocus
                          inputMode="decimal"
                          defaultValue={formatQty(item.quantity)}
                          onBlur={(e) => {
                            setEditing(null);
                            const value = Number(e.target.value.replace(",", "."));
                            if (Number.isFinite(value) && value !== item.quantity) void setQuantity(item, value);
                          }}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") (e.target as HTMLInputElement).blur();
                          }}
                          className="h-12 w-20 rounded-control bg-muted text-center text-xl font-bold focus:outline-none focus:ring-2 focus:ring-accent/40"
                        />
                      ) : (
                        <button
                          type="button"
                          onClick={() => setEditing(item.id)}
                          className={cn(
                            "h-12 w-20 rounded-control text-center text-xl font-bold tabular-nums",
                            lowItem ? "bg-destructive/10 text-destructive" : "bg-muted text-foreground"
                          )}
                          aria-label="Saisir la quantité"
                        >
                          {formatQty(item.quantity)}
                        </button>
                      )}
                      <button
                        type="button"
                        aria-label="Plus un"
                        onClick={() => setQuantity(item, item.quantity + 1)}
                        className="flex h-12 w-12 items-center justify-center rounded-pill bg-muted text-foreground active:scale-95"
                      >
                        <Plus className="h-5 w-5" />
                      </button>
                    </div>
                  </li>
                );
              })}
            </ul>
          </section>
        );
      })}
    </div>
  );
}

"use client";

import { useMemo, useState } from "react";
import { AlertTriangle, CheckCircle2, ClipboardCheck, Minus, Plus, Search } from "lucide-react";
import { OfflineBanner, useOnline, useToast } from "@/components/ui/toast";
import { useOfflineQueue } from "@/lib/offline-queue";
import { CATEGORY_LABELS, CATEGORY_ORDER, ZONE_LABELS, type StaffInventoryItem, type Zone } from "@/types";
import { groupStockByFamily } from "@/lib/inventory-taxonomy";
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
  const [zone, setZone] = useState<Zone | "all">("all");
  const [editing, setEditing] = useState<string | null>(null);
  const [due, setDue] = useState(inventoryDue);
  const toast = useToast();
  const online = useOnline();
  const { pending, enqueue } = useOfflineQueue(`stock.${siteId}`);

  const low = useMemo(() => items.filter(isLow), [items]);
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return items.filter((i) => {
      if (zone !== "all" && i.zone !== zone) return false;
      if (q && !i.name.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [items, query, zone]);

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
        <section className="rounded-lg border border-destructive/30 bg-card p-3.5">
          <h2 className="flex items-center gap-2 text-[14px] font-semibold text-foreground">
            <AlertTriangle className="h-4 w-4 text-destructive" />
            {low.length} produit{low.length > 1 ? "s" : ""} sous seuil
          </h2>
          <p className="mt-1 text-[12px] text-muted-foreground">Ajustez la quantité ci-dessous, ou notez la commande fournisseur.</p>
          <ul className="mt-2.5 space-y-1.5">
            {low.map((item) => (
              <li key={item.id} className="flex items-center justify-between gap-3 rounded-md bg-destructive/5 px-2.5 py-2 text-[13px]">
                <button type="button" className="min-w-0 truncate text-left font-medium text-foreground" onClick={() => setEditing(item.id)}>
                  {item.name}
                </button>
                <span className="shrink-0 font-mono text-[12px] tabular-nums text-destructive">
                  {formatQty(item.quantity)} {item.unit}
                </span>
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
            className="min-h-10 w-full rounded-md bg-card pl-10 pr-3 text-[15px] shadow-sm focus:outline-none focus:ring-2 focus:ring-accent/40"
          />
        </label>
        {due ? (
          <button
            type="button"
            onClick={markInventoryDone}
            className="flex min-h-10 items-center justify-center gap-1.5 rounded-md bg-warning px-3.5 text-[13px] font-semibold text-warning-foreground"
          >
            <ClipboardCheck className="h-5 w-5" /> Inventaire du mois : marquer comme fait
          </button>
        ) : (
          <span className="flex min-h-10 items-center gap-1.5 rounded-md bg-card px-3.5 text-[13px] font-medium text-success shadow-sm">
            <CheckCircle2 className="h-5 w-5" /> Inventaire du mois fait
          </span>
        )}
      </div>
      <div className="flex gap-2 overflow-x-auto">
        {(["all", "cuisine", "salle"] as const).map((z) => (
          <button
            key={z}
            type="button"
            onClick={() => setZone(z)}
            className={cn(
              "min-h-10 shrink-0 rounded-md px-3 text-[13px] font-semibold",
              zone === z ? "bg-foreground text-background" : "border border-border bg-card"
            )}
          >
            {z === "all" ? "Tous les rayons" : ZONE_LABELS[z]}
          </button>
        ))}
      </div>

      {items.length === 0 && (
        <p className="rounded-lg border border-border bg-card p-5 text-center text-[13px] text-muted-foreground">
          Aucun article de stock. La direction peut en ajouter depuis « Stock ».
        </p>
      )}

      {CATEGORY_ORDER.map((category) => {
        const families = groupStockByFamily(filtered.filter((i) => i.category === category));
        if (families.length === 0) return null;
        return (
          <section key={category}>
            <h2 className="mb-2 text-base font-bold text-muted-foreground">{CATEGORY_LABELS[category]}</h2>
            {families.map((family) => (
              <div key={family.family} className="mb-3">
                <h3 className="mb-1.5 text-[11px] font-semibold uppercase tracking-[0.04em] text-muted-foreground">
                  {family.label}
                </h3>
                <ul className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
                  {family.items.map((item) => {
                    const lowItem = isLow(item);
                    return (
                      <li
                        key={item.id}
                        className={cn(
                          "flex items-center gap-3 rounded-lg border bg-card p-3 shadow-sm",
                          lowItem ? "border-destructive/50" : "border-transparent"
                        )}
                      >
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-[15px] font-semibold tracking-tight text-foreground">{item.name}</p>
                          <p className="text-xs text-muted-foreground">
                            {ZONE_LABELS[item.zone]} · {item.unit}
                            {item.lowStockThreshold !== null && ` · alerte sous ${formatQty(item.lowStockThreshold)}`}
                          </p>
                        </div>
                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            aria-label="Moins un"
                            onClick={() => setQuantity(item, item.quantity - 1)}
                            className="flex h-10 w-10 items-center justify-center rounded-md bg-muted text-foreground active:scale-95"
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
                              className="h-10 w-16 rounded-control bg-muted text-center text-[15px] font-bold focus:outline-none focus:ring-2 focus:ring-accent/40"
                            />
                          ) : (
                            <button
                              type="button"
                              onClick={() => setEditing(item.id)}
                              className={cn(
                                "h-10 w-16 rounded-control text-center text-[15px] font-bold tabular-nums",
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
                            className="flex h-10 w-10 items-center justify-center rounded-md bg-muted text-foreground active:scale-95"
                          >
                            <Plus className="h-5 w-5" />
                          </button>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              </div>
            ))}
          </section>
        );
      })}
    </div>
  );
}

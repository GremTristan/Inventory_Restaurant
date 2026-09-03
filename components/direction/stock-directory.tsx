"use client";

import { useMemo, useState } from "react";
import { AlertTriangle, Search, Trash2 } from "lucide-react";
import { AutoSaveForm, DeleteButton } from "@/components/direction/forms";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { deleteInventoryItemAction, updateInventoryItemAction } from "@/lib/direction-actions";
import { groupStockByFamily, matchesStockQuery } from "@/lib/inventory-taxonomy";
import { formatMoney } from "@/lib/money";
import { CATEGORY_LABELS, CATEGORY_ORDER, ZONE_LABELS, type Category, type InventoryItem, type Supplier, type Zone } from "@/types";
import { cn } from "@/lib/utils";

function isLowStock(item: InventoryItem) {
  return item.lowStockThreshold !== null && item.quantity <= item.lowStockThreshold;
}

export function StockDirectory({
  items,
  suppliers,
  supplierName,
  currency,
}: {
  items: InventoryItem[];
  suppliers: Supplier[];
  supplierName: Record<string, string>;
  currency: string;
}) {
  const [query, setQuery] = useState("");
  const [zone, setZone] = useState<Zone | "all">("all");
  const [category, setCategory] = useState<Category | "all">("all");

  const filtered = useMemo(() => {
    return items.filter((i) => {
      if (!matchesStockQuery(i, query)) return false;
      if (zone !== "all" && i.zone !== zone) return false;
      if (category !== "all" && i.category !== category) return false;
      return true;
    });
  }, [items, query, zone, category]);

  const byCategory = CATEGORY_ORDER.map((c) => ({
    category: c,
    families: groupStockByFamily(filtered.filter((i) => i.category === c)),
  })).filter((row) => row.families.length > 0);

  const value = (list: InventoryItem[]) => list.reduce((s, i) => s + i.quantity * i.unitPrice, 0);

  return (
    <div>
      <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center">
        <label className="relative min-w-0 flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Chercher parmi les références…"
            className="min-h-11 w-full rounded-md border border-border bg-card pl-10 pr-3 text-[14px] focus:outline-none focus:ring-2 focus:ring-accent/40"
          />
        </label>
        <div className="flex gap-2 overflow-x-auto">
          {(["all", "cuisine", "salle"] as const).map((z) => (
            <button
              key={z}
              type="button"
              onClick={() => setZone(z)}
              className={cn(
                "min-h-11 shrink-0 rounded-md px-3 text-[13px] font-semibold",
                zone === z ? "bg-foreground text-background" : "border border-border bg-card"
              )}
            >
              {z === "all" ? "Tous les rayons" : ZONE_LABELS[z]}
            </button>
          ))}
        </div>
      </div>
      <div className="mb-5 flex gap-1.5 overflow-x-auto">
        <button
          type="button"
          onClick={() => setCategory("all")}
          className={cn(
            "min-h-8 shrink-0 rounded-md border px-3 text-[12px] font-medium",
            category === "all" ? "border-foreground bg-foreground text-background" : "border-border bg-card text-muted-foreground"
          )}
        >
          Toutes catégories
        </button>
        {CATEGORY_ORDER.map((c) => (
          <button
            key={c}
            type="button"
            onClick={() => setCategory(c)}
            className={cn(
              "min-h-8 shrink-0 rounded-md border px-3 text-[12px] font-medium",
              category === c ? "border-foreground bg-foreground text-background" : "border-border bg-card text-muted-foreground"
            )}
          >
            {CATEGORY_LABELS[c]}
          </button>
        ))}
      </div>
      <p className="mb-4 text-[12px] text-muted-foreground">
        {filtered.length} référence{filtered.length > 1 ? "s" : ""} · {formatMoney(value(filtered), currency)}
      </p>
      {filtered.length === 0 ? (
        <p className="rounded-lg border border-dashed border-border bg-card px-4 py-8 text-center text-[13px] text-muted-foreground">
          Aucune référence pour ces filtres.
        </p>
      ) : (
        byCategory.map(({ category: cat, families }) => (
          <section key={cat} className="mb-6">
            <h2 className="mb-2 text-base font-bold text-muted-foreground">
              {CATEGORY_LABELS[cat]} · {formatMoney(value(filtered.filter((i) => i.category === cat)), currency)}
            </h2>
            {families.map((family) => (
              <div key={family.family} className="mb-4">
                <h3 className="mb-2 text-[12px] font-semibold uppercase tracking-[0.04em] text-muted-foreground">
                  {family.label} · {family.items.length}
                </h3>
                <ul className="space-y-2">
                  {family.items.map((item) => (
                    <li key={item.id} className="rounded-lg border border-border bg-card p-3 shadow-sm">
                      <AutoSaveForm action={updateInventoryItemAction} className="grid grid-cols-2 items-end gap-2 sm:grid-cols-3 lg:grid-cols-[1fr_6rem_7rem_7rem_10rem_8rem_auto]">
                        <input type="hidden" name="id" value={item.id} />
                        <label className="col-span-2 block text-xs text-muted-foreground sm:col-span-3 lg:col-span-1">
                          <span className="flex items-center gap-1">
                            Article {isLowStock(item) && <AlertTriangle className="h-3.5 w-3.5 text-destructive" />}
                          </span>
                          <Input name="name" defaultValue={item.name} className="mt-0.5 min-h-11" />
                        </label>
                        <label className="block text-xs text-muted-foreground">
                          Qté ({item.unit})
                          <Input name="quantity" type="number" step="0.1" min="0" defaultValue={item.quantity} className="mt-0.5 min-h-11 tabular-nums" />
                        </label>
                        <label className="block text-xs text-muted-foreground">
                          Prix d’achat
                          <Input name="unitPrice" type="number" step="0.01" min="0" defaultValue={item.unitPrice.toFixed(2)} className="mt-0.5 min-h-11 tabular-nums" />
                        </label>
                        <label className="block text-xs text-muted-foreground">
                          Seuil d’alerte
                          <Input name="lowStockThreshold" type="number" step="0.1" min="0" defaultValue={item.lowStockThreshold ?? ""} placeholder="—" className="mt-0.5 min-h-11 tabular-nums" />
                        </label>
                        <label className="block text-xs text-muted-foreground">
                          Fournisseur
                          <Select name="supplierId" defaultValue={item.supplierId ?? ""} className="mt-0.5 min-h-11 w-full">
                            <option value="">—</option>
                            {suppliers.map((s) => (
                              <option key={s.id} value={s.id}>
                                {s.name}
                              </option>
                            ))}
                          </Select>
                        </label>
                        <label className="flex min-h-11 items-center gap-2 text-xs text-muted-foreground">
                          <input type="hidden" name="visibleToServerField" value="1" />
                          <input
                            type="checkbox"
                            name="visibleToServer"
                            value="true"
                            defaultChecked={item.visibleToServer}
                            className="h-5 w-5 accent-[var(--accent)]"
                          />
                          Visible salle
                        </label>
                        <div className="flex items-center justify-end gap-2">
                          <span className="text-sm font-semibold tabular-nums text-foreground">{formatMoney(item.quantity * item.unitPrice, currency)}</span>
                          <DeleteButton action={deleteInventoryItemAction} fields={{ id: item.id }} message={`${item.name} supprimé`} variant="ghost" size="icon" aria-label="Supprimer" confirmLabel="Supprimer ?">
                            <Trash2 className="h-5 w-5 text-destructive" />
                          </DeleteButton>
                        </div>
                      </AutoSaveForm>
                      {item.supplierId && <p className="mt-1 text-xs text-muted-foreground">Fournisseur : {supplierName[item.supplierId]}</p>}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </section>
        ))
      )}
    </div>
  );
}

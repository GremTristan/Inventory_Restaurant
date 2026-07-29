"use client";

import { useState } from "react";
import type { InventoryItem, SiteId, Supplier } from "@/types";
import { CATEGORY_LABELS } from "@/types";
import { totalStockValue, formatCHF, groupByCategory } from "@/lib/inventory";
import { CategoryDot } from "@/components/ui/category-dot";
import { updateInventoryItemAction } from "@/lib/inventory-actions";
import { useDebouncedCallback } from "@/lib/use-debounced-callback";

// Quantity edits show instantly via local state (optimistic), then persist
// to the server after a short pause — see useDebouncedCallback. Only
// quantity is editable here — price and supplier are read-only display for
// chef crêpier/waiter, who count stock, not manage pricing.
export function InventoryCards({
  initialItems,
  siteId,
  suppliers,
}: {
  initialItems: InventoryItem[];
  siteId: SiteId;
  suppliers: Supplier[];
}) {
  const [items, setItems] = useState(initialItems);

  const persistQuantity = useDebouncedCallback((itemId: string, quantity: number) => {
    const formData = new FormData();
    formData.set("itemId", itemId);
    formData.set("siteId", siteId);
    formData.set("quantity", String(quantity));
    updateInventoryItemAction(formData);
  });

  function updateQuantity(id: string, quantity: number) {
    const safeQuantity = Number.isFinite(quantity) ? Math.max(0, quantity) : 0;
    setItems((current) =>
      current.map((item) => (item.id === id ? { ...item, quantity: safeQuantity } : item))
    );
    persistQuantity(id, safeQuantity);
  }

  const categoryGroups = groupByCategory(items);
  const total = totalStockValue(items);

  return (
    <div className="space-y-8">
      {categoryGroups.map(({ category, items: categoryItems }) => (
        <section key={category}>
          <h2 className="mb-3 flex items-center gap-2 text-base font-semibold text-foreground">
            <CategoryDot category={category} />
            {CATEGORY_LABELS[category]}
          </h2>
          <div className="flex flex-col gap-3">
            {categoryItems.map((item) => (
              <InventoryCard
                key={item.id}
                item={item}
                supplierName={suppliers.find((s) => s.id === item.supplierId)?.name}
                onQuantityChange={updateQuantity}
              />
            ))}
          </div>
        </section>
      ))}

      {items.length > 0 && (
        <div className="flex items-center justify-between px-1 text-sm text-muted-foreground">
          <span>Valeur totale du stock</span>
          <span className="tabular-nums">{formatCHF(total)}</span>
        </div>
      )}
    </div>
  );
}

function InventoryCard({
  item,
  supplierName,
  onQuantityChange,
}: {
  item: InventoryItem;
  supplierName?: string;
  onQuantityChange: (id: string, quantity: number) => void;
}) {
  return (
    <details className="group rounded-xl border border-border bg-card open:pb-4">
      <summary className="flex cursor-pointer list-none items-center justify-between gap-4 px-4 py-4 [&::-webkit-details-marker]:hidden">
        <span className="text-lg font-medium text-foreground">
          {item.name}
          <span className="ml-2 text-sm font-normal text-muted-foreground">{item.unit}</span>
          {item.unitsPerPackage > 1 && item.packageContentLabel && (
            <span className="ml-2 block text-xs font-normal text-muted-foreground">
              = {item.quantity * item.unitsPerPackage} {item.packageContentLabel}
            </span>
          )}
        </span>
        <Stepper
          value={item.quantity}
          onDecrement={() => onQuantityChange(item.id, item.quantity - 1)}
          onIncrement={() => onQuantityChange(item.id, item.quantity + 1)}
          onValueChange={(quantity) => onQuantityChange(item.id, quantity)}
        />
      </summary>
      <div className="border-t border-border px-4 pt-3">
        <dl className="flex flex-col gap-1.5 text-sm">
          <div className="flex justify-between">
            <dt className="text-muted-foreground">Fournisseur</dt>
            <dd className="text-foreground">{supplierName ?? "—"}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-muted-foreground">Prix unitaire</dt>
            <dd className="text-foreground">{formatCHF(item.unitPrice)}</dd>
          </div>
        </dl>
      </div>
    </details>
  );
}

function Stepper({
  value,
  onDecrement,
  onIncrement,
  onValueChange,
}: {
  value: number;
  onDecrement: () => void;
  onIncrement: () => void;
  onValueChange: (value: number) => void;
}) {
  return (
    <div className="flex items-center gap-3">
      <button
        type="button"
        aria-label="Retirer un"
        disabled={value === 0}
        onClick={(e) => {
          e.preventDefault();
          onDecrement();
        }}
        className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-black/[0.04] text-2xl font-medium text-foreground transition-colors active:bg-black/10 disabled:opacity-40 disabled:pointer-events-none"
      >
        −
      </button>
      {/* Tapping the number opens the keyboard for direct entry — handy for
          large quantities where tapping +/- a hundred times isn't realistic. */}
      <input
        type="number"
        inputMode="numeric"
        min={0}
        value={value}
        onClick={(e) => e.preventDefault()}
        onChange={(e) => onValueChange(e.target.valueAsNumber)}
        className="w-16 shrink-0 rounded-lg border border-transparent bg-transparent text-center text-2xl font-semibold tabular-nums text-foreground focus:border-accent focus:bg-card focus:outline-none focus:ring-1 focus:ring-accent"
      />
      <button
        type="button"
        aria-label="Ajouter un"
        onClick={(e) => {
          e.preventDefault();
          onIncrement();
        }}
        className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-black/[0.04] text-2xl font-medium text-foreground transition-colors active:bg-black/10"
      >
        +
      </button>
    </div>
  );
}

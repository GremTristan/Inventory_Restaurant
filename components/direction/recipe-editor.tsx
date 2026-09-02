"use client";

import { useState, useTransition } from "react";
import { ChevronDown, ChevronUp, Plus } from "lucide-react";
import { useToast } from "@/components/ui/toast";
import { setIngredientAction } from "@/lib/direction-actions";
import type { InventoryItem, MenuItem, MenuItemIngredient } from "@/types";

// Recipe = what one sale takes out of stock. Optional: without it, stock is
// counted by hand; with it, every kitchen ticket decrements automatically.
export function RecipeEditor({
  menuItem,
  inventory,
  lines,
}: {
  menuItem: MenuItem;
  inventory: InventoryItem[];
  lines: MenuItemIngredient[];
}) {
  const [open, setOpen] = useState(false);
  const [adding, setAdding] = useState(false);
  const [pending, start] = useTransition();
  const toast = useToast();
  const byId = new Map(inventory.map((i) => [i.id, i]));
  const unused = inventory.filter((i) => !lines.some((l) => l.inventoryItemId === i.id));

  const save = (inventoryItemId: string, quantity: number) =>
    start(async () => {
      const fd = new FormData();
      fd.set("menuItemId", menuItem.id);
      fd.set("inventoryItemId", inventoryItemId);
      fd.set("quantity", String(quantity));
      try {
        await setIngredientAction(fd);
        toast("success", quantity > 0 ? "Recette enregistrée" : "Ingrédient retiré");
        setAdding(false);
      } catch (error) {
        toast("error", error instanceof Error ? error.message : "Échec");
      }
    });

  return (
    <div className="mt-2 border-t border-border pt-2">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex min-h-9 items-center gap-1 text-xs font-semibold text-muted-foreground hover:text-foreground"
      >
        {open ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
        Décrément automatique du stock {lines.length > 0 ? `· ${lines.length} ingrédient${lines.length > 1 ? "s" : ""}` : "· non configuré"}
      </button>
      {open && (
        <div className="mt-2 space-y-2 text-sm">
          {inventory.length === 0 && (
            <p className="text-muted-foreground">Ajoutez d’abord des articles dans « Stock » pour cet établissement.</p>
          )}
          {lines.map((line) => {
            const item = byId.get(line.inventoryItemId);
            if (!item) return null;
            return (
              <div key={line.id} className="flex items-center gap-2">
                <span className="flex-1 font-medium text-foreground">{item.name}</span>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  defaultValue={line.quantity}
                  disabled={pending}
                  onBlur={(e) => {
                    const q = Number(e.target.value);
                    if (Number.isFinite(q) && q !== line.quantity) save(item.id, q);
                  }}
                  className="min-h-10 w-24 rounded-control bg-muted px-3 text-right tabular-nums focus:outline-none focus:ring-2 focus:ring-accent/40"
                  aria-label={`Quantité de ${item.name} par vente`}
                />
                <span className="w-16 text-muted-foreground">{item.unit} / vente</span>
                <button type="button" onClick={() => save(item.id, 0)} className="min-h-10 px-2 text-xs font-medium text-destructive hover:underline">
                  Retirer
                </button>
              </div>
            );
          })}
          {adding ? (
            <div className="flex flex-wrap items-center gap-2">
              <select
                id={`add-${menuItem.id}`}
                className="min-h-10 flex-1 rounded-control bg-muted px-3 focus:outline-none focus:ring-2 focus:ring-accent/40"
                defaultValue=""
                onChange={(e) => {
                  if (e.target.value) save(e.target.value, 1);
                }}
              >
                <option value="" disabled>
                  Choisir un article de stock…
                </option>
                {unused.map((i) => (
                  <option key={i.id} value={i.id}>
                    {i.name} ({i.unit})
                  </option>
                ))}
              </select>
              <button type="button" onClick={() => setAdding(false)} className="min-h-10 px-2 text-xs text-muted-foreground hover:underline">
                Annuler
              </button>
            </div>
          ) : (
            unused.length > 0 && (
              <button
                type="button"
                onClick={() => setAdding(true)}
                className="flex min-h-10 items-center gap-1 rounded-pill bg-muted px-3 text-xs font-semibold text-foreground hover:bg-border/60"
              >
                <Plus className="h-4 w-4" /> Ajouter un ingrédient
              </button>
            )
          )}
        </div>
      )}
    </div>
  );
}

"use client";

import { useMemo, useState } from "react";
import { Search } from "lucide-react";
import { Eye, EyeOff, Trash2 } from "lucide-react";
import { ActionButton, AutoSaveForm, DeleteButton } from "@/components/direction/forms";
import { RecipeEditor } from "@/components/direction/recipe-editor";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { deleteMenuItemAction, updateMenuItemAction } from "@/lib/direction-actions";
import { groupMenuByFamily, matchesQuery } from "@/lib/menu-taxonomy";
import { MENU_CATEGORY_LABELS, MENU_CATEGORY_ORDER, type InventoryItem, type MenuItem, type MenuItemIngredient } from "@/types";

export function MenuDirectory({
  menu,
  inventory,
  ingredients,
  recipesEnabled,
}: {
  menu: MenuItem[];
  inventory: InventoryItem[];
  ingredients: MenuItemIngredient[];
  recipesEnabled: boolean;
}) {
  const [query, setQuery] = useState("");
  const filtered = useMemo(() => menu.filter((m) => matchesQuery(m.name, query)), [menu, query]);
  const grouped = useMemo(() => groupMenuByFamily(filtered), [filtered]);

  return (
    <div>
      <label className="relative mb-5 block">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Chercher un produit de la carte…"
          className="min-h-11 w-full rounded-md border border-border bg-card pl-10 pr-3 text-[14px] focus:outline-none focus:ring-2 focus:ring-accent/40"
        />
      </label>
      {filtered.length === 0 ? (
        <p className="rounded-lg border border-dashed border-border bg-card px-4 py-8 text-center text-[13px] text-muted-foreground">
          Aucun produit pour cette recherche.
        </p>
      ) : (
        grouped.map((group) => (
          <section key={group.family} className="mb-6">
            <h2 className="mb-2 text-base font-bold text-muted-foreground">
              {group.label}
              <span className="ml-2 font-mono text-[13px] font-medium tabular-nums">{group.items.length}</span>
            </h2>
            <ul className="space-y-2">
              {group.items.map((item) => (
                <li key={item.id} className="rounded-lg border border-border bg-card p-3 shadow-sm">
                  <div className="flex flex-wrap items-center gap-2">
                    <AutoSaveForm action={updateMenuItemAction} className="flex min-w-0 flex-1 flex-wrap items-center gap-2">
                      <input type="hidden" name="id" value={item.id} />
                      <Input name="name" defaultValue={item.name} aria-label="Nom" className="min-h-11 min-w-40 flex-1" />
                      <Input
                        name="price"
                        type="number"
                        step="0.10"
                        min="0"
                        defaultValue={item.price.toFixed(2)}
                        aria-label="Prix"
                        className="min-h-11 w-28 text-right tabular-nums"
                      />
                      <Select name="category" defaultValue={item.category} aria-label="Famille de carte" className="min-h-11">
                        {MENU_CATEGORY_ORDER.map((c) => (
                          <option key={c} value={c}>
                            {MENU_CATEGORY_LABELS[c]}
                          </option>
                        ))}
                      </Select>
                    </AutoSaveForm>
                    <ActionButton
                      action={updateMenuItemAction}
                      fields={{ id: item.id, available: item.available ? "false" : "true" }}
                      message={item.available ? `${item.name} retiré des tablettes` : `${item.name} de nouveau disponible`}
                      variant={item.available ? "secondary" : "outline"}
                      className={item.available ? "" : "border-warning text-warning"}
                    >
                      {item.available ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
                      {item.available ? "Disponible" : "En rupture"}
                    </ActionButton>
                    <DeleteButton action={deleteMenuItemAction} fields={{ id: item.id }} message={`${item.name} supprimé`} variant="ghost" size="icon" aria-label="Supprimer" confirmLabel="Supprimer ?">
                      <Trash2 className="h-5 w-5 text-destructive" />
                    </DeleteButton>
                  </div>
                  <RecipeEditor
                    menuItem={item}
                    inventory={inventory}
                    lines={ingredients.filter((i) => i.menuItemId === item.id)}
                    enabled={recipesEnabled}
                  />
                </li>
              ))}
            </ul>
          </section>
        ))
      )}
    </div>
  );
}

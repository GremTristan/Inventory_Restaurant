"use client";

import { useRef, useState } from "react";
import type { InventoryItem, SiteId, Supplier } from "@/types";
import { CATEGORY_LABELS, CATEGORY_COLORS } from "@/types";
import { totalStockValue, formatCHF, groupByCategory } from "@/lib/inventory";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { CategoryDot } from "@/components/ui/category-dot";
import { Table, TableCell, TableFootRow, TableHead, TableHeaderRow, TableRow } from "@/components/ui/table";
import { cn } from "@/lib/utils";
import {
  deleteInventoryItemAction,
  setItemVisibilityAction,
  updateInventoryItemAction,
} from "@/lib/inventory-actions";
import { useDebouncedCallback } from "@/lib/use-debounced-callback";

// Quantity/price edits show instantly via local state (optimistic), then
// persist to the server after a short pause in typing/clicking — see
// useDebouncedCallback. Visibility is persisted immediately via
// setItemVisibilityAction — the caller remounts this component (via a `key`
// derived from the visibility flags) after a toggle so the fresh server
// data replaces local state cleanly.
export function InventoryTable({
  initialItems,
  editableVisibility = false,
  siteId,
  suppliers,
}: {
  initialItems: InventoryItem[];
  editableVisibility?: boolean;
  siteId: SiteId;
  suppliers: Supplier[];
}) {
  const [items, setItems] = useState(initialItems);

  const persistUpdate = useDebouncedCallback(
    (itemId: string, field: "quantity" | "unitPrice", value: number) => {
      const formData = new FormData();
      formData.set("itemId", itemId);
      formData.set("siteId", siteId);
      formData.set(field, String(value));
      updateInventoryItemAction(formData);
    }
  );

  function updateItem(id: string, field: "quantity" | "unitPrice", value: number) {
    const safeValue = Number.isFinite(value) ? Math.max(0, value) : 0;
    setItems((current) =>
      current.map((item) => (item.id === id ? { ...item, [field]: safeValue } : item))
    );
    persistUpdate(id, field, safeValue);
  }

  function removeItem(id: string) {
    setItems((current) => current.filter((item) => item.id !== id));
  }

  // In visibility-edit mode, show every article (regardless of current
  // visibility) grouped by category, with both role checkboxes exposed —
  // the director needs to see and toggle hidden items too, not just the
  // ones currently visible.
  if (editableVisibility) {
    const categoryGroups = groupByCategory(items);
    return (
      <div className="space-y-6">
        {categoryGroups.map(({ category, items: categoryItems }) => (
          <div key={category} className={cn("border-l-2 pl-4", CATEGORY_COLORS[category].border)}>
            <h3 className="mb-2 flex items-center gap-2 text-sm font-medium text-foreground">
              <CategoryDot category={category} />
              {CATEGORY_LABELS[category]}
            </h3>
            <VisibilityTable items={categoryItems} siteId={siteId} />
          </div>
        ))}
      </div>
    );
  }

  const visibleItems = items.filter((item) => item.visibleToManager);
  const categoryGroups = groupByCategory(visibleItems);

  return (
    <div className="space-y-6">
      {categoryGroups.map(({ category, items: categoryItems }) => (
        <div key={category} className={cn("border-l-2 pl-4", CATEGORY_COLORS[category].border)}>
          <h3 className="mb-2 flex items-center gap-2 text-sm font-medium text-foreground">
            <CategoryDot category={category} />
            {CATEGORY_LABELS[category]}
          </h3>
          <ItemsTable
            items={categoryItems}
            suppliers={suppliers}
            siteId={siteId}
            onUpdate={updateItem}
            onDelete={removeItem}
            totalLabel={`Sous-total — ${CATEGORY_LABELS[category]}`}
          />
        </div>
      ))}

      {visibleItems.length > 0 && (
        <div className="flex items-center justify-end gap-2 rounded-xl border border-border bg-muted px-4 py-3">
          <span className="text-sm font-medium text-muted-foreground">Valeur totale du stock</span>
          <span className="text-base font-semibold tabular-nums text-foreground">
            {formatCHF(totalStockValue(visibleItems))}
          </span>
        </div>
      )}
    </div>
  );
}

function ItemsTable({
  items,
  suppliers,
  siteId,
  onUpdate,
  onDelete,
  totalLabel,
}: {
  items: InventoryItem[];
  suppliers: Supplier[];
  siteId: SiteId;
  onUpdate: (id: string, field: "quantity" | "unitPrice", value: number) => void;
  onDelete: (id: string) => void;
  totalLabel: string;
}) {
  const total = totalStockValue(items);

  return (
    <Table>
      <thead>
        <TableHeaderRow>
          <TableHead>Article</TableHead>
          <TableHead>Unité</TableHead>
          <TableHead>Fournisseur</TableHead>
          <TableHead>Quantité</TableHead>
          <TableHead>Prix unitaire</TableHead>
          <TableHead className="text-right">Valeur du stock</TableHead>
          <TableHead />
        </TableHeaderRow>
      </thead>
      <tbody>
        {items.map((item) => (
          <ItemRow
            key={item.id}
            item={item}
            suppliers={suppliers}
            siteId={siteId}
            onUpdate={onUpdate}
            onDelete={onDelete}
          />
        ))}
      </tbody>
      <tfoot>
        <TableFootRow>
          <TableCell colSpan={5} className="text-right text-sm font-medium text-muted-foreground">
            {totalLabel}
          </TableCell>
          <TableCell className="text-right text-base font-semibold tabular-nums text-foreground">
            {formatCHF(total)}
          </TableCell>
          <TableCell />
        </TableFootRow>
      </tfoot>
    </Table>
  );
}

function ItemRow({
  item,
  suppliers,
  siteId,
  onUpdate,
  onDelete,
}: {
  item: InventoryItem;
  suppliers: Supplier[];
  siteId: SiteId;
  onUpdate: (id: string, field: "quantity" | "unitPrice", value: number) => void;
  onDelete: (id: string) => void;
}) {
  const supplierName = suppliers.find((s) => s.id === item.supplierId)?.name;
  const stockValue = item.quantity * item.unitPrice;

  return (
    <TableRow>
      <TableCell className="font-medium text-foreground">{item.name}</TableCell>
      <TableCell className="text-muted-foreground">{item.unit}</TableCell>
      <TableCell className="text-muted-foreground">{supplierName ?? "—"}</TableCell>
      <TableCell>
        <div className="flex items-center gap-2">
          <Input
            type="number"
            min={0}
            step="1"
            value={item.quantity}
            onChange={(e) => onUpdate(item.id, "quantity", e.target.valueAsNumber)}
            className="w-20 tabular-nums"
          />
          {item.unitsPerPackage > 1 && item.packageContentLabel && (
            <span className="whitespace-nowrap text-xs text-muted-foreground">
              = {item.quantity * item.unitsPerPackage} {item.packageContentLabel}
            </span>
          )}
        </div>
      </TableCell>
      <TableCell>
        <div className="flex items-center gap-1">
          <span className="text-muted-foreground">CHF</span>
          <Input
            type="number"
            min={0}
            step="0.05"
            value={item.unitPrice}
            onChange={(e) => onUpdate(item.id, "unitPrice", e.target.valueAsNumber)}
            className="w-24 tabular-nums"
          />
        </div>
      </TableCell>
      <TableCell className="text-right font-medium tabular-nums text-foreground">
        {formatCHF(stockValue)}
      </TableCell>
      <TableCell>
        <form
          action={async (formData) => {
            onDelete(item.id);
            await deleteInventoryItemAction(formData);
          }}
        >
          <input type="hidden" name="itemId" value={item.id} />
          <input type="hidden" name="siteId" value={siteId} />
          <Button type="submit" variant="destructive" className="px-3 py-1 text-xs">
            Supprimer
          </Button>
        </form>
      </TableCell>
    </TableRow>
  );
}

// Visibility-edit view: one row per article, one checkbox per audience
// role. Quantity/price aren't editable here — this screen is purely about
// who gets to see what, kept separate from the stock-count/pricing table
// above so toggling visibility never risks touching a number by mistake.
function VisibilityTable({ items, siteId }: { items: InventoryItem[]; siteId?: SiteId }) {
  return (
    <Table>
      <thead>
        <TableHeaderRow>
          <TableHead>Article</TableHead>
          <TableHead className="text-center">Chef crêpier</TableHead>
          <TableHead className="text-center">Serveur</TableHead>
        </TableHeaderRow>
      </thead>
      <tbody>
        {items.map((item) => (
          <VisibilityRow key={item.id} item={item} siteId={siteId} />
        ))}
      </tbody>
    </Table>
  );
}

function VisibilityRow({ item, siteId }: { item: InventoryItem; siteId?: SiteId }) {
  const managerFormRef = useRef<HTMLFormElement>(null);
  const waiterFormRef = useRef<HTMLFormElement>(null);

  return (
    <TableRow>
      <TableCell className="font-medium text-foreground">{item.name}</TableCell>
      <TableCell className="text-center">
        <form ref={managerFormRef} action={setItemVisibilityAction}>
          <input type="hidden" name="itemId" value={item.id} />
          <input type="hidden" name="siteId" value={siteId} />
          <input type="hidden" name="forRole" value="manager" />
          <input type="hidden" name="visible" value={String(!item.visibleToManager)} />
          <input
            type="checkbox"
            aria-label={`Visible pour le chef crêpier — ${item.name}`}
            checked={item.visibleToManager}
            onChange={() => managerFormRef.current?.requestSubmit()}
            className="h-4 w-4 accent-accent"
          />
        </form>
      </TableCell>
      <TableCell className="text-center">
        <form ref={waiterFormRef} action={setItemVisibilityAction}>
          <input type="hidden" name="itemId" value={item.id} />
          <input type="hidden" name="siteId" value={siteId} />
          <input type="hidden" name="forRole" value="waiter" />
          <input type="hidden" name="visible" value={String(!item.visibleToServer)} />
          <input
            type="checkbox"
            aria-label={`Visible pour le serveur — ${item.name}`}
            checked={item.visibleToServer}
            onChange={() => waiterFormRef.current?.requestSubmit()}
            className="h-4 w-4 accent-accent"
          />
        </form>
      </TableCell>
    </TableRow>
  );
}

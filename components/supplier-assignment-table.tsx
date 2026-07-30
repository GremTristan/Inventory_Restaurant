"use client";

import { useRef } from "react";
import type { InventoryItem, Supplier } from "@/types";
import { CATEGORY_LABELS, CATEGORY_ORDER } from "@/types";
import { getSiteById } from "@/data/sites";
import { updateItemSupplierAction } from "@/lib/supplier-actions";
import { setItemCategoryAction } from "@/lib/inventory-actions";
import { Select } from "@/components/ui/select";
import { TableCell, TableHead, TableHeaderRow, TableRow } from "@/components/ui/table";

export function SupplierAssignmentTable({
  items,
  suppliers,
}: {
  items: InventoryItem[];
  suppliers: Supplier[];
}) {
  if (items.length === 0) {
    return <p className="text-sm text-muted-foreground">Aucun article pour le moment.</p>;
  }

  // Two independent per-row <Select> controls don't translate naturally to
  // a card list (unlike ItemsTable's plain number fields) — kept as a
  // desktop-shaped table on every viewport, horizontally scrollable on
  // narrow screens, same deliberate choice as VisibilityTable.
  return (
    <div className="overflow-x-auto rounded-card bg-card shadow-[0_1px_2px_rgba(20,24,27,0.04),0_8px_24px_-8px_rgba(20,24,27,0.08)]">
      <table className="w-full text-sm">
        <thead>
          <TableHeaderRow>
            <TableHead>Article</TableHead>
            <TableHead>Établissement</TableHead>
            <TableHead>Fournisseur</TableHead>
            <TableHead>Catégorie</TableHead>
          </TableHeaderRow>
        </thead>
        <tbody>
          {items.map((item) => (
            <ItemRow key={item.id} item={item} suppliers={suppliers} />
          ))}
        </tbody>
      </table>
    </div>
  );
}

function ItemRow({ item, suppliers }: { item: InventoryItem; suppliers: Supplier[] }) {
  const supplierFormRef = useRef<HTMLFormElement>(null);
  const categoryFormRef = useRef<HTMLFormElement>(null);

  return (
    <TableRow>
      <TableCell className="font-medium text-foreground">{item.name}</TableCell>
      <TableCell className="text-muted-foreground">{getSiteById(item.siteId)?.name ?? item.siteId}</TableCell>
      <TableCell>
        <form ref={supplierFormRef} action={updateItemSupplierAction}>
          <input type="hidden" name="itemId" value={item.id} />
          <Select
            name="supplierId"
            defaultValue={item.supplierId ?? ""}
            onChange={() => supplierFormRef.current?.requestSubmit()}
            className="w-56"
          >
            <option value="">Aucun fournisseur</option>
            {suppliers.map((supplier) => (
              <option key={supplier.id} value={supplier.id}>
                {supplier.name}
              </option>
            ))}
          </Select>
        </form>
      </TableCell>
      <TableCell>
        <form ref={categoryFormRef} action={setItemCategoryAction}>
          <input type="hidden" name="itemId" value={item.id} />
          <Select
            name="category"
            defaultValue={item.category}
            onChange={() => categoryFormRef.current?.requestSubmit()}
            className="w-48"
          >
            {CATEGORY_ORDER.map((category) => (
              <option key={category} value={category}>
                {CATEGORY_LABELS[category]}
              </option>
            ))}
          </Select>
        </form>
      </TableCell>
    </TableRow>
  );
}

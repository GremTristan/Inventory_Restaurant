"use client";

import { useRef } from "react";
import type { InventoryItem, Supplier } from "@/types";
import { CATEGORY_LABELS, CATEGORY_ORDER } from "@/types";
import { getSiteById } from "@/data/sites";
import { updateItemSupplierAction } from "@/lib/supplier-actions";
import { setItemCategoryAction } from "@/lib/inventory-actions";
import { Select } from "@/components/ui/select";
import { Table, TableCell, TableHead, TableHeaderRow, TableRow } from "@/components/ui/table";

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

  return (
    <Table>
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
    </Table>
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

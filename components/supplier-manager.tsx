"use client";

import { useState } from "react";
import type { Supplier } from "@/types";
import {
  createSupplierAction,
  deleteSupplierAction,
  renameSupplierAction,
} from "@/lib/supplier-actions";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

export function SupplierManager({ suppliers }: { suppliers: Supplier[] }) {
  const [editingId, setEditingId] = useState<string | null>(null);

  return (
    <div className="overflow-hidden rounded-xl border border-border bg-card">
      <ul className="divide-y divide-border">
        {suppliers.map((supplier) =>
          editingId === supplier.id ? (
            <li key={supplier.id} className="flex items-center gap-2 px-4 py-2.5">
              <form
                action={async (formData) => {
                  await renameSupplierAction(formData);
                  setEditingId(null);
                }}
                className="flex flex-1 items-center gap-2"
              >
                <input type="hidden" name="id" value={supplier.id} />
                <Input name="name" defaultValue={supplier.name} className="flex-1" autoFocus />
                <Button type="submit" variant="secondary" className="px-3 py-1 text-xs">
                  Enregistrer
                </Button>
              </form>
              <Button
                type="button"
                variant="ghost"
                className="px-3 py-1 text-xs"
                onClick={() => setEditingId(null)}
              >
                Annuler
              </Button>
            </li>
          ) : (
            <li key={supplier.id} className="flex items-center justify-between px-4 py-2.5">
              <span className="text-sm font-medium text-foreground">{supplier.name}</span>
              <div className="flex items-center gap-1">
                <Button
                  type="button"
                  variant="ghost"
                  className="px-3 py-1 text-xs"
                  onClick={() => setEditingId(supplier.id)}
                >
                  Renommer
                </Button>
                <form action={deleteSupplierAction}>
                  <input type="hidden" name="id" value={supplier.id} />
                  <Button type="submit" variant="destructive" className="px-3 py-1 text-xs">
                    Supprimer
                  </Button>
                </form>
              </div>
            </li>
          )
        )}
        {suppliers.length === 0 && (
          <li className="px-4 py-3 text-sm text-muted-foreground">Aucun fournisseur pour le moment.</li>
        )}
      </ul>
      <form
        action={async (formData) => {
          await createSupplierAction(formData);
        }}
        className="flex items-center gap-2 border-t border-border bg-muted px-4 py-3"
      >
        <Input name="name" placeholder="Nouveau fournisseur" className="flex-1" required />
        <Button type="submit" variant="primary" className="px-3 py-1.5 text-xs">
          Ajouter
        </Button>
      </form>
    </div>
  );
}

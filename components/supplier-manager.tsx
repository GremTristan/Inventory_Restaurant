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
    <div className="flex flex-col gap-4">
      <ul className="flex flex-col gap-2">
        {suppliers.map((supplier) =>
          editingId === supplier.id ? (
            <li key={supplier.id} className="flex items-center gap-2 rounded-card bg-muted/40 px-4 py-3">
              <form
                action={async (formData) => {
                  await renameSupplierAction(formData);
                  setEditingId(null);
                }}
                className="flex flex-1 items-center gap-2"
              >
                <input type="hidden" name="id" value={supplier.id} />
                <Input name="name" defaultValue={supplier.name} className="flex-1" autoFocus />
                <Button type="submit" variant="secondary" size="sm">
                  Enregistrer
                </Button>
              </form>
              <Button type="button" variant="ghost" size="sm" onClick={() => setEditingId(null)}>
                Annuler
              </Button>
            </li>
          ) : (
            <li
              key={supplier.id}
              className="flex items-center justify-between rounded-card bg-muted/40 px-4 py-3.5"
            >
              <span className="text-sm font-medium text-foreground">{supplier.name}</span>
              <div className="flex items-center gap-1">
                <Button type="button" variant="ghost" size="sm" onClick={() => setEditingId(supplier.id)}>
                  Renommer
                </Button>
                <form action={deleteSupplierAction}>
                  <input type="hidden" name="id" value={supplier.id} />
                  <Button type="submit" variant="destructive" size="sm">
                    Supprimer
                  </Button>
                </form>
              </div>
            </li>
          )
        )}
        {suppliers.length === 0 && (
          <li className="px-1 py-3 text-sm text-muted-foreground">Aucun fournisseur pour le moment.</li>
        )}
      </ul>
      <form
        action={async (formData) => {
          await createSupplierAction(formData);
        }}
        className="flex items-center gap-2 rounded-card bg-muted/60 px-4 py-3"
      >
        <Input name="name" placeholder="Nouveau fournisseur" className="flex-1" required />
        <Button type="submit" variant="primary" size="sm">
          Ajouter
        </Button>
      </form>
    </div>
  );
}

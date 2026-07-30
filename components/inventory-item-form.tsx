"use client";

import { useRef } from "react";
import { CATEGORY_LABELS, CATEGORY_ORDER, ZONE_LABELS, type Zone } from "@/types";
import { sites } from "@/data/sites";
import { addInventoryItemAction } from "@/lib/inventory-actions";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Button } from "@/components/ui/button";

const ZONE_ORDER: Zone[] = ["cuisine", "salle"];

export function InventoryItemForm() {
  const formRef = useRef<HTMLFormElement>(null);

  return (
    <form
      ref={formRef}
      action={async (formData) => {
        await addInventoryItemAction(formData);
        formRef.current?.reset();
      }}
      className="grid grid-cols-1 gap-3 rounded-card bg-muted/60 p-4 sm:grid-cols-2 sm:p-6 lg:grid-cols-7"
    >
      <Select name="siteId" defaultValue={sites[0].id} required>
        {sites.map((site) => (
          <option key={site.id} value={site.id}>
            {site.name}
          </option>
        ))}
      </Select>
      <Input name="name" placeholder="Nom de l'article" required className="lg:col-span-2" />
      <Input name="unit" placeholder="Unité achetée (kg, pack de 12L…)" required />
      <Select name="category" defaultValue={CATEGORY_ORDER[0]} required>
        {CATEGORY_ORDER.map((category) => (
          <option key={category} value={category}>
            {CATEGORY_LABELS[category]}
          </option>
        ))}
      </Select>
      <Select name="zone" defaultValue={ZONE_ORDER[0]} required>
        {ZONE_ORDER.map((zone) => (
          <option key={zone} value={zone}>
            {ZONE_LABELS[zone]}
          </option>
        ))}
      </Select>
      <Input name="quantity" type="number" min={0} step="1" placeholder="Quantité (nb d'unités)" defaultValue={0} required />
      <div className="flex items-center gap-2 sm:col-span-2 lg:col-span-4">
        <Input
          name="unitsPerPackage"
          type="number"
          min={1}
          step="1"
          placeholder="Contenu par unité"
          defaultValue={1}
          className="w-36"
        />
        <Input name="packageContentLabel" placeholder="Dont le contenu est en… (œufs, L…)" className="flex-1" />
      </div>
      <p className="text-xs text-muted-foreground sm:col-span-2 lg:col-span-7 lg:-mt-2">
        Laissez « Contenu par unité » à 1 si l&apos;unité achetée est déjà l&apos;unité de base (kg, L, bouteille…).
        Sinon indiquez combien de kg/L/pièces contient une unité — ex. 12 pour un pack de 12L ou une douzaine d&apos;œufs.
      </p>
      <div className="flex items-center gap-2 sm:col-span-2 lg:col-span-7">
        <div className="flex flex-1 items-center gap-1">
          <span className="text-muted-foreground">CHF</span>
          <Input name="unitPrice" type="number" min={0} step="0.05" placeholder="Prix unitaire" defaultValue={0} required />
        </div>
        <Button type="submit" variant="primary" size="sm">
          Ajouter l&apos;article
        </Button>
      </div>
    </form>
  );
}

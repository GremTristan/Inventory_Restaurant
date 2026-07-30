"use client";

import { useState } from "react";
import type { InventoryItem, SiteId, Supplier, Zone } from "@/types";
import { ZONE_LABELS } from "@/types";
import { InventoryTable } from "@/components/inventory-table";
import { InventoryCards } from "@/components/inventory-cards";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const ZONE_ORDER: Zone[] = ["cuisine", "salle"];

export function InventoryView({
  items,
  siteId,
  isDirector,
  suppliers,
}: {
  items: InventoryItem[];
  siteId: SiteId;
  isDirector: boolean;
  suppliers: Supplier[];
}) {
  const [editMode, setEditMode] = useState(false);
  const [zone, setZone] = useState<Zone>("cuisine");

  // Forces InventoryTable to remount when a visibility or category change
  // updates the server data (after revalidatePath) — the table's own
  // quantity/price state is intentionally local-only and should reset to
  // the fresh values.
  const itemsKey = items
    .map((item) => `${item.id}:${item.visibleToManager}:${item.visibleToServer}:${item.category}`)
    .join(",");

  // Only the director splits stock by physical area (kitchen vs. dining
  // room) — chef crêpier and waiter each already see a role-scoped subset
  // and don't need a second axis of filtering on top.
  const zoneItems = isDirector ? items.filter((item) => item.zone === zone) : items;

  return (
    <div className="space-y-4">
      {isDirector && (
        <div className="flex items-center justify-between">
          <div className="inline-flex rounded-pill bg-muted p-1">
            {ZONE_ORDER.map((z) => (
              <button
                key={z}
                type="button"
                onClick={() => setZone(z)}
                className={cn(
                  "rounded-pill px-4 py-1.5 text-sm font-medium transition-colors",
                  zone === z
                    ? "bg-accent text-accent-foreground"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                {ZONE_LABELS[z]}
              </button>
            ))}
          </div>
          <Button variant="secondary" onClick={() => setEditMode((v) => !v)}>
            {editMode ? "Terminer la modification" : "Gérer la visibilité"}
          </Button>
        </div>
      )}
      {isDirector ? (
        <InventoryTable
          key={`${itemsKey}:${zone}`}
          initialItems={zoneItems}
          editableVisibility={isDirector && editMode}
          siteId={siteId}
          suppliers={suppliers}
        />
      ) : (
        <InventoryCards key={itemsKey} initialItems={items} siteId={siteId} suppliers={suppliers} />
      )}
    </div>
  );
}

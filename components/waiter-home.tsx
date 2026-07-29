import { NavCard } from "@/components/ui/nav-card";
import type { SiteId } from "@/types";

// Landing view for the waiter role: the till entry is the one task that
// actually needs doing every day, so it's the card that stands out.
// Inventory isn't the waiter's job — the card stays reachable (a waiter may
// still want to glance at dining-room stock) but visually muted so it never
// competes with the till card for attention.
export function WaiterHome({
  siteId,
  salesPending,
}: {
  siteId: SiteId;
  salesPending: boolean;
}) {
  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
      <NavCard
        href={`/inventory/${siteId}`}
        title="Inventaire"
        description="Rien à faire ici pour le moment."
        state="muted"
      />
      <NavCard
        href={`/inventory/${siteId}/sales`}
        title="Vente du jour"
        description={
          salesPending ? "À remplir : chiffre d'affaires et ventes du jour." : "Déjà saisie aujourd'hui."
        }
        state={salesPending ? "highlighted" : "neutral"}
      />
    </div>
  );
}

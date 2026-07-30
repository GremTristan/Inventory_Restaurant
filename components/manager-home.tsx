import { NavCard } from "@/components/ui/nav-card";
import type { SiteId } from "@/types";

// Landing view for the chef crêpier role: a single "Inventaire" card,
// mirroring the waiter's home screen. Unlike the waiter's muted-but-
// clickable inventory card, this one is a genuine gate — the director must
// flip the access toggle on the dashboard before the card becomes a real
// link. Not a NavCard when locked: a disabled-looking link that still
// navigates would be misleading.
export function ManagerHome({ siteId, accessGranted }: { siteId: SiteId; accessGranted: boolean }) {
  if (!accessGranted) {
    return (
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div className="flex items-center justify-between rounded-card bg-card px-4 py-3.5 opacity-60 shadow-[0_1px_2px_rgba(20,24,27,0.04),0_8px_24px_-8px_rgba(20,24,27,0.08)]">
          <div>
            <p className="text-sm font-semibold text-foreground">Inventaire</p>
            <p className="mt-0.5 text-xs text-muted-foreground">
              Autorisation requise — demandez au directeur de l&apos;activer.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
      <NavCard
        href={`/inventory/${siteId}`}
        title="Inventaire"
        description="Voir le stock, gérer la visibilité et modifier les quantités."
      />
    </div>
  );
}

"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { SiteHealth } from "@/lib/inventory";
import type { SiteId } from "@/types";
import { formatCHF, siteHealthStatus } from "@/lib/inventory";
import { setInventoryAccessAction } from "@/lib/inventory-access-actions";
import { CategoryDot } from "@/components/ui/category-dot";
import { StatusPill } from "@/components/ui/status-pill";
import { NavCard } from "@/components/ui/nav-card";
import { cn } from "@/lib/utils";

export function SiteSelector({
  sitesHealth,
  grandTotal,
  inventoryAccessBySite,
  currentSiteId,
  navigateSuffix,
  compact = false,
}: {
  sitesHealth: SiteHealth[];
  grandTotal: number;
  inventoryAccessBySite: Record<SiteId, boolean>;
  // When on a site-scoped page (Caisse/Inventaire), pass the site currently
  // being viewed and the path suffix ("" for /inventory/{site}, "/sales"
  // for /inventory/{site}/sales) — the dropdown then navigates to the same
  // page for the other site instead of just changing local state, since the
  // table/history below is server-rendered for a specific site. A plain
  // string (not a function) so it stays serializable across the server/
  // client boundary.
  currentSiteId?: SiteId;
  navigateSuffix?: string;
  // Dashboard-only rendering: just the health banner + a single arrow link
  // into the site, no Caisse/Inventaire cards and no access toggle — those
  // now live directly on the Caisse/Inventaire pages themselves.
  compact?: boolean;
}) {
  const router = useRouter();
  const [selectedId, setSelectedId] = useState(currentSiteId ?? sitesHealth[0]?.siteId);
  const site = sitesHealth.find((s) => s.siteId === selectedId) ?? sitesHealth[0];
  if (!site) return null;

  const accessGranted = inventoryAccessBySite[site.siteId] ?? false;

  const status = siteHealthStatus(site);
  const share = grandTotal > 0 ? (site.totalValue / grandTotal) * 100 : 0;

  function handleChange(nextSiteId: SiteId) {
    if (navigateSuffix !== undefined) {
      router.push(`/inventory/${nextSiteId}${navigateSuffix}`);
      return;
    }
    setSelectedId(nextSiteId);
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center gap-x-6 gap-y-2 rounded-card bg-muted/60 px-4 py-3">
        <div className="flex items-center gap-2">
          <label className="text-xs font-medium text-muted-foreground" htmlFor="site-selector">
            Établissement
          </label>
          <select
            id="site-selector"
            value={site.siteId}
            onChange={(e) => handleChange(e.target.value as SiteId)}
            className="rounded-control border border-transparent bg-card px-3 py-1.5 text-sm font-medium text-foreground focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/40"
          >
            {sitesHealth.map((s) => (
              <option key={s.siteId} value={s.siteId}>
                {s.siteName}
              </option>
            ))}
          </select>
        </div>

        <StatusPill status={status}>
          {status === "good" ? "OK" : status === "watch" ? "Attention" : "Critique"}
        </StatusPill>

        <p className="text-lg font-semibold tabular-nums text-foreground">{formatCHF(site.totalValue)}</p>

        <span className="text-xs text-muted-foreground">
          {share.toFixed(0)}% du groupe · {site.itemCount} articles
        </span>

        {site.topCategory && (
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <CategoryDot category={site.topCategory.category} />
            Dominante : {site.topCategory.label}
          </div>
        )}

        {site.unassignedCount > 0 && (
          <p className={cn("text-xs font-medium text-amber-600", !compact && "ml-auto")}>
            {site.unassignedCount} article(s) sans fournisseur
          </p>
        )}

        {compact && (
          <Link
            href={`/inventory/${site.siteId}`}
            className="ml-auto flex items-center gap-1 text-sm font-medium text-accent hover:text-accent-hover"
          >
            Voir l&apos;établissement
            <span aria-hidden="true">→</span>
          </Link>
        )}
      </div>

      {!compact && (
        <>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <NavCard
              href={`/inventory/${site.siteId}/sales`}
              title="Caisse"
              description="Voir, modifier et consulter l'historique des ventes."
            />
            <NavCard
              href={`/inventory/${site.siteId}`}
              title="Inventaire"
              description="Voir le stock, gérer la visibilité et modifier les quantités."
            />
          </div>

          <form
            action={setInventoryAccessAction}
            className="flex items-center justify-between rounded-card bg-card px-4 py-3 shadow-[0_1px_2px_rgba(20,24,27,0.04),0_8px_24px_-8px_rgba(20,24,27,0.08)]"
          >
            <input type="hidden" name="siteId" value={site.siteId} />
            <input type="hidden" name="granted" value={String(!accessGranted)} />
            <div>
              <p className="text-sm font-medium text-foreground">Autoriser l&apos;inventaire (chef crêpier)</p>
              <p className="mt-0.5 text-xs text-muted-foreground">
                {accessGranted
                  ? "Le chef crêpier peut accéder à l'inventaire."
                  : "L'accès à l'inventaire est verrouillé pour le chef crêpier."}
              </p>
            </div>
            <button
              type="submit"
              role="switch"
              aria-checked={accessGranted}
              aria-label="Autoriser l'inventaire pour le chef crêpier"
              className={cn(
                "relative h-6 w-11 shrink-0 rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-background",
                accessGranted ? "bg-accent" : "bg-border"
              )}
            >
              <span
                className={cn(
                  "absolute top-0.5 h-5 w-5 rounded-full bg-white shadow-sm transition-transform",
                  accessGranted ? "translate-x-[22px]" : "translate-x-0.5"
                )}
              />
            </button>
          </form>
        </>
      )}
    </div>
  );
}

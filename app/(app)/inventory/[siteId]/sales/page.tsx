import { notFound, redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/session";
import { getSiteById } from "@/data/sites";
import {
  getDailySalesBySite,
  getDailySalesEntry,
  getInventoryAccessBySite,
  getMenuItems,
  todayPeriod,
} from "@/lib/sales-store";
import { getAllInventoryItems } from "@/lib/inventory-store";
import { DailySalesForm } from "@/components/daily-sales-form";
import { RevenueSparkline } from "@/components/revenue-sparkline";
import { Section } from "@/components/ui/section";
import { Table, TableCell, TableHead, TableHeaderRow, TableRow } from "@/components/ui/table";
import { SiteSelector } from "@/components/site-selector";
import { formatCHF, siteHealth, totalStockValue } from "@/lib/inventory";
import type { SiteId } from "@/types";

export default async function DailySalesPage({
  params,
}: {
  params: Promise<{ siteId: string }>;
}) {
  const { siteId } = await params;
  const site = getSiteById(siteId);
  if (!site) notFound();

  const user = await getCurrentUser();
  if (!user) redirect("/login");

  // Managers and waiters are locked to their own site; directors can view
  // any site's sales.
  if (user.role !== "director" && user.siteId !== site.id) {
    redirect(`/inventory/${user.siteId}`);
  }

  const canSubmit = user.role === "director" || user.role === "waiter";
  const menu = getMenuItems(site.id as SiteId);
  const history = getDailySalesBySite(site.id as SiteId);
  const todayEntry = canSubmit
    ? getDailySalesEntry(site.id as SiteId, todayPeriod())
    : undefined;
  const isDirector = user.role === "director";

  let siteSelector: React.ReactNode = null;
  if (isDirector) {
    const allItems = getAllInventoryItems();
    siteSelector = (
      <div className="mb-6">
        <SiteSelector
          sitesHealth={siteHealth(allItems)}
          grandTotal={totalStockValue(allItems)}
          inventoryAccessBySite={getInventoryAccessBySite()}
          currentSiteId={site.id as SiteId}
          navigateSuffix="/sales"
        />
      </div>
    );
  }

  return (
    <>
      {siteSelector}
      <h1 className="text-xl font-semibold text-foreground">Ventes du jour — {site.name}</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        {canSubmit
          ? "Saisissez le chiffre d'affaires et les quantités vendues pour aujourd'hui."
          : "Historique des chiffres déjà saisis pour cet établissement."}
      </p>

      <div className="mt-6 flex flex-col gap-6">
        {canSubmit && (
          <Section
            title="Saisie du jour"
            description="Une saisie par jour — resoumettre aujourd'hui met à jour l'entrée existante."
          >
            <DailySalesForm siteId={site.id as SiteId} menu={menu} existingEntry={todayEntry} />
          </Section>
        )}

        <Section title="Historique" description="Chiffres déjà enregistrés, du plus récent au plus ancien.">
          {history.length === 0 ? (
            <p className="text-sm text-muted-foreground">Aucune journée enregistrée pour le moment.</p>
          ) : (
            <>
              <RevenueSparkline history={history} />
              <Table>
                <thead>
                  <TableHeaderRow>
                    <TableHead>Date</TableHead>
                    <TableHead className="text-right">CB</TableHead>
                    <TableHead className="text-right">CA net</TableHead>
                    <TableHead className="text-right">Espèces</TableHead>
                    <TableHead className="text-right">Unités vendues</TableHead>
                    <TableHead>Détail</TableHead>
                  </TableHeaderRow>
                </thead>
                <tbody>
                  {history.map((entry) => {
                    const totalUnits = Object.values(entry.quantities).reduce((sum, q) => sum + q, 0);
                    const cashRevenue = Math.max(0, entry.netRevenue - entry.cardRevenue);
                    const detail = menu
                      .filter((item) => (entry.quantities[item.id] ?? 0) > 0)
                      .map((item) => `${item.name} × ${entry.quantities[item.id]}`)
                      .join(", ");
                    return (
                      <TableRow key={entry.id}>
                        <TableCell className="font-medium text-foreground">{entry.date}</TableCell>
                        <TableCell className="text-right tabular-nums text-foreground">
                          {formatCHF(entry.cardRevenue)}
                        </TableCell>
                        <TableCell className="text-right tabular-nums text-foreground">
                          {formatCHF(entry.netRevenue)}
                        </TableCell>
                        <TableCell className="text-right tabular-nums text-muted-foreground">
                          {formatCHF(cashRevenue)}
                        </TableCell>
                        <TableCell className="text-right tabular-nums text-muted-foreground">
                          {totalUnits}
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground">{detail || "—"}</TableCell>
                      </TableRow>
                    );
                  })}
                </tbody>
              </Table>
            </>
          )}
        </Section>
      </div>
    </>
  );
}

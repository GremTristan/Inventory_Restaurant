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
import { TableCell, TableHead, TableHeaderRow, TableRow } from "@/components/ui/table";
import { ResponsiveDataList } from "@/components/ui/responsive-data-list";
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
  const [menu, history, todayEntry] = await Promise.all([
    getMenuItems(site.id as SiteId),
    getDailySalesBySite(site.id as SiteId),
    canSubmit ? getDailySalesEntry(site.id as SiteId, todayPeriod()) : Promise.resolve(undefined),
  ]);
  const isDirector = user.role === "director";

  let siteSelector: React.ReactNode = null;
  if (isDirector) {
    const [allItems, inventoryAccessBySite] = await Promise.all([
      getAllInventoryItems(),
      getInventoryAccessBySite(),
    ]);
    siteSelector = (
      <div className="mb-6">
        <SiteSelector
          sitesHealth={siteHealth(allItems)}
          grandTotal={totalStockValue(allItems)}
          inventoryAccessBySite={inventoryAccessBySite}
          currentSiteId={site.id as SiteId}
          navigateSuffix="/sales"
        />
      </div>
    );
  }

  return (
    <>
      {siteSelector}
      <h1 className="text-2xl font-bold text-foreground sm:text-3xl">Ventes du jour — {site.name}</h1>
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
              <div className="mt-4">
                <ResponsiveDataList
                  items={history}
                  getKey={(entry) => entry.id}
                  tableHead={
                    <TableHeaderRow>
                      <TableHead>Date</TableHead>
                      <TableHead className="text-right">CB</TableHead>
                      <TableHead className="text-right">CA net</TableHead>
                      <TableHead className="text-right">Espèces</TableHead>
                      <TableHead className="text-right">Unités vendues</TableHead>
                      <TableHead>Détail</TableHead>
                    </TableHeaderRow>
                  }
                  renderRow={(entry) => {
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
                  }}
                  renderCard={(entry) => {
                    const totalUnits = Object.values(entry.quantities).reduce((sum, q) => sum + q, 0);
                    const cashRevenue = Math.max(0, entry.netRevenue - entry.cardRevenue);
                    const detail = menu
                      .filter((item) => (entry.quantities[item.id] ?? 0) > 0)
                      .map((item) => `${item.name} × ${entry.quantities[item.id]}`)
                      .join(", ");
                    return (
                      <div className="rounded-card bg-card p-4 shadow-[0_1px_2px_rgba(20,24,27,0.04),0_8px_24px_-8px_rgba(20,24,27,0.08)]">
                        <div className="flex items-center justify-between">
                          <p className="text-sm font-bold text-foreground">{entry.date}</p>
                          <span className="rounded-pill bg-muted px-2.5 py-1 text-xs font-semibold text-muted-foreground">
                            {totalUnits} unités
                          </span>
                        </div>
                        <div className="mt-3 grid grid-cols-3 gap-2 text-center">
                          <div>
                            <p className="text-xs text-muted-foreground">CB</p>
                            <p className="text-base font-bold tabular-nums text-metric-card-payment">
                              {formatCHF(entry.cardRevenue)}
                            </p>
                          </div>
                          <div>
                            <p className="text-xs text-muted-foreground">Espèces</p>
                            <p className="text-base font-bold tabular-nums text-metric-cash-payment">
                              {formatCHF(cashRevenue)}
                            </p>
                          </div>
                          <div>
                            <p className="text-xs text-muted-foreground">CA net</p>
                            <p className="text-base font-bold tabular-nums text-foreground">
                              {formatCHF(entry.netRevenue)}
                            </p>
                          </div>
                        </div>
                        {detail && <p className="mt-3 truncate text-xs text-muted-foreground">{detail}</p>}
                      </div>
                    );
                  }}
                />
              </div>
            </>
          )}
        </Section>
      </div>
    </>
  );
}

import { redirect } from "next/navigation";
import Link from "next/link";
import { getCurrentUser } from "@/lib/session";
import { getAllInventoryItems, getSuppliers } from "@/lib/inventory-store";
import { getDailySalesBySite, getInventoryAccessBySite, getPendingReminderCounts } from "@/lib/sales-store";
import { getAllUsers, getUsersBySite } from "@/lib/user-store";
import { sites } from "@/data/sites";
import {
  formatCHF,
  groupHealthScore,
  siteHealth,
  totalStockValue,
  unassignedBySite,
  valueByCategory,
  valueBySupplier,
} from "@/lib/inventory";
import { aggregateRevenueByDate } from "@/lib/sales";
import { computeInsights, pendingReminderInsight } from "@/lib/ai-insights";
import { SiteSelector } from "@/components/site-selector";
import { Card } from "@/components/ui/card";
import { CategoryDot } from "@/components/ui/category-dot";
import { ProgressRing } from "@/components/ui/progress-ring";
import { StatusPill } from "@/components/ui/status-pill";
import { StatTile } from "@/components/ui/stat-tile";
import { TrendChart } from "@/components/ui/trend-chart";
import { InsightsPanel } from "@/components/insights-panel";
import type { HealthStatus } from "@/lib/inventory";

export default async function DashboardPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (user.role !== "director") redirect(`/inventory/${user.siteId}`);

  const inventory = getAllInventoryItems();
  const suppliers = getSuppliers();
  const inventoryAccessBySite = getInventoryAccessBySite();
  const allUsers = getAllUsers();
  const employees = allUsers.filter((u) => u.role !== "director");
  const allDailySales = sites.flatMap((site) => getDailySalesBySite(site.id));
  const pendingCounts = getPendingReminderCounts();

  const grandTotal = totalStockValue(inventory);
  const health = groupHealthScore(inventory, suppliers);
  const sitesHealth = siteHealth(inventory);
  const categories = valueByCategory(inventory);
  const supplierExposure = valueBySupplier(inventory, suppliers);
  const unassignedGroups = unassignedBySite(inventory);
  const totalUnassigned = inventory.filter((item) => !item.supplierId).length;

  const coverageShare = 100 - (inventory.length > 0 ? (totalUnassigned / inventory.length) * 100 : 0);
  const coverageStatus: HealthStatus = coverageShare >= 90 ? "good" : coverageShare >= 60 ? "watch" : "critical";

  const revenuePoints = aggregateRevenueByDate(allDailySales);
  const latestRevenuePoint = revenuePoints[revenuePoints.length - 1];
  const trendPoints = revenuePoints.slice(-14);

  const sitesWithPendingCount = Object.values(pendingCounts).filter((count) => (count ?? 0) > 0).length;

  const insights = computeInsights({
    inventory,
    suppliers,
    allDailySales,
    employees,
    sites,
  });
  const reminderInsight = pendingReminderInsight(sitesWithPendingCount);
  const allInsights = reminderInsight ? [reminderInsight, ...insights] : insights;
  const aiConfigured = Boolean(process.env.OLLAMA_API_KEY);

  return (
    <>
      <div>
        <h1 className="text-xl font-semibold text-foreground">Bonjour {user.name.split(" ")[0]} 👋</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Voici l&apos;état de santé du groupe, {sitesHealth.length} établissements.
        </p>
      </div>
      <div className="mt-4">
        <SiteSelector
          sitesHealth={sitesHealth}
          grandTotal={grandTotal}
          inventoryAccessBySite={inventoryAccessBySite}
          compact
        />
      </div>

      {/* Hero: overall health score + group stat tiles */}
      <Card className="mt-6 flex flex-col items-center gap-6 p-5 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-6">
          <ProgressRing value={health.score} status={health.status} label="SANTÉ" size={140} strokeWidth={13} />
          <div>
            <StatusPill status={health.status}>{health.label}</StatusPill>
            <p className="mt-3 text-3xl font-semibold tabular-nums text-foreground">{formatCHF(grandTotal)}</p>
            <p className="text-sm text-muted-foreground">Valeur totale du stock, groupe entier</p>
          </div>
        </div>
        <div className="grid w-full grid-cols-2 gap-3 sm:w-auto sm:grid-cols-4">
          <StatTile
            status={coverageStatus}
            value={`${coverageShare.toFixed(0)}%`}
            label="Fournisseurs assignés"
          />
          <StatTile
            value={latestRevenuePoint ? formatCHF(latestRevenuePoint.netRevenue) : "Aucune donnée"}
            label="CA du groupe (dernier jour)"
          />
          <StatTile value={String(employees.length)} label="Effectifs (hors direction)" />
          <StatTile
            status={sitesWithPendingCount > 0 ? "watch" : "good"}
            value={String(sitesWithPendingCount)}
            label="Sites avec tâches en attente"
          />
        </div>
      </Card>

      {/* AI-assisted insights */}
      <div className="mt-6">
        <InsightsPanel insights={allInsights} aiConfigured={aiConfigured} />
      </div>

      {/* Group revenue trend */}
      <Card className="mt-6 p-5">
        <h2 className="text-base font-semibold text-foreground">Tendance du chiffre d&apos;affaires</h2>
        <p className="mt-0.5 text-xs text-muted-foreground">Somme des ventes quotidiennes, tous sites confondus.</p>
        <div className="mt-5">
          {trendPoints.length < 2 ? (
            <p className="text-sm text-muted-foreground">
              Pas encore assez de données — enregistrez les ventes quotidiennes pour voir apparaître la tendance.
            </p>
          ) : (
            <TrendChart
              series={[
                {
                  id: "revenue",
                  label: "CA du groupe",
                  color: "var(--chart-1)",
                  points: trendPoints.map((p) => ({ x: p.date, y: p.netRevenue })),
                },
              ]}
              formatValue={formatCHF}
            />
          )}
        </div>
      </Card>

      <div className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-2">
        {/* Category balance */}
        <Card className="p-5">
          <h2 className="text-base font-semibold text-foreground">Équilibre des catégories</h2>
          <p className="mt-0.5 text-xs text-muted-foreground">
            Trop de valeur en produits frais expose au risque de perte.
          </p>
          <div className="mt-5 space-y-4">
            {categories.map((cat) => (
              <div key={cat.category}>
                <div className="flex items-center justify-between text-sm">
                  <span className="flex items-center gap-2 font-medium text-foreground">
                    <CategoryDot category={cat.category} />
                    {cat.label}
                  </span>
                  <span className="tabular-nums text-muted-foreground">
                    {formatCHF(cat.totalValue)} · {cat.share.toFixed(0)}%
                  </span>
                </div>
                <div className="mt-1.5 h-2.5 overflow-hidden rounded-full bg-muted">
                  <div
                    className="h-full rounded-full bg-accent transition-all"
                    style={{ width: `${cat.share}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </Card>

        {/* Supplier risk */}
        <Card className="p-5">
          <h2 className="text-base font-semibold text-foreground">Fournisseurs</h2>
          <p className="mt-0.5 text-xs text-muted-foreground">Qui porte la valeur de votre stock.</p>
          <div className="mt-5 space-y-3">
            {supplierExposure.slice(0, 5).map((supplier) => (
              <div key={supplier.supplierId ?? "none"} className="flex items-center gap-3">
                <div className="flex-1">
                  <div className="flex items-center justify-between text-sm">
                    <span
                      className={`font-medium ${supplier.supplierId ? "text-foreground" : "text-destructive"}`}
                    >
                      {supplier.supplierName}
                    </span>
                    <span className="tabular-nums text-muted-foreground">{supplier.share.toFixed(0)}%</span>
                  </div>
                  <div className="mt-1 h-2 overflow-hidden rounded-full bg-muted">
                    <div
                      className={`h-full rounded-full transition-all ${
                        !supplier.supplierId
                          ? "bg-destructive"
                          : supplier.share >= 50
                            ? "bg-destructive"
                            : supplier.share >= 30
                              ? "bg-warning"
                              : "bg-success"
                      }`}
                      style={{ width: `${supplier.share}%` }}
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>

      {/* RH: effectifs par établissement */}
      <Card className="mt-6 p-5">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-base font-semibold text-foreground">Effectifs par établissement</h2>
            <p className="mt-0.5 text-xs text-muted-foreground">Chef crêpier et serveurs assignés à chaque site.</p>
          </div>
          <Link href="/dashboard/employes" className="text-sm font-medium text-accent hover:text-accent-hover">
            Gérer
          </Link>
        </div>
        <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {sites.map((site) => {
            const siteEmployees = getUsersBySite(site.id);
            const manager = siteEmployees.find((e) => e.role === "manager");
            const waiterCount = siteEmployees.filter((e) => e.role === "waiter").length;
            return (
              <div key={site.id} className="rounded-xl bg-muted px-4 py-3">
                <p className="text-sm font-medium text-foreground">{site.name}</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {manager ? manager.name : "Aucun chef crêpier"} · {waiterCount} serveur(s)
                </p>
              </div>
            );
          })}
        </div>
      </Card>

      {/* Action needed */}
      {unassignedGroups.length > 0 && (
        <Card className="mt-6 p-5">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-semibold text-foreground">À traiter</h2>
              <p className="mt-0.5 text-xs text-muted-foreground">
                {totalUnassigned} article(s) sans fournisseur assigné, risque d&apos;approvisionnement.
              </p>
            </div>
            <Link
              href="/dashboard/suppliers"
              className="rounded-full bg-accent px-4 py-2 text-xs font-medium text-accent-foreground hover:bg-accent-hover"
            >
              Assigner maintenant
            </Link>
          </div>
          <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
            {unassignedGroups.map((group) => (
              <div key={group.siteId} className="rounded-xl bg-muted px-4 py-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-foreground">{group.siteName}</span>
                  <span className="text-xs font-semibold text-destructive">{group.items.length}</span>
                </div>
                <p className="mt-1 truncate text-xs text-muted-foreground">
                  {group.items.map((item) => item.name).join(", ")}
                </p>
              </div>
            ))}
          </div>
        </Card>
      )}
    </>
  );
}

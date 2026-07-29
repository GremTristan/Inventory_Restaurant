import type { DailySalesEntry, InventoryItem, Supplier, User, SiteId } from "@/types";
import type { HealthStatus } from "@/lib/inventory";
import { siteHealth, unassignedBySite, valueByCategory, valueBySupplier } from "@/lib/inventory";
import { aggregateRevenueByDate } from "@/lib/sales";

export interface Insight {
  id: string;
  severity: HealthStatus;
  title: string;
  detail: string;
  href?: string;
}

export interface ComputeInsightsInput {
  inventory: InventoryItem[];
  suppliers: Supplier[];
  allDailySales: DailySalesEntry[];
  employees: User[];
  sites: { id: SiteId; name: string }[];
}

// Rule-based, deterministic insight engine — no network calls, no LLM. Every
// rule derives from data the group already tracks (inventory, sales,
// employees), so it's always available even without an AI narrative
// configured. Sorted critical-first so the most actionable item leads.
export function computeInsights(input: ComputeInsightsInput): Insight[] {
  const insights: Insight[] = [
    ...supplierConcentrationInsights(input),
    ...unassignedArticleInsights(input),
    ...perishablesExposureInsights(input),
    ...siteHealthOutlierInsights(input),
    ...revenueTrendInsights(input),
    ...staffingGapInsights(input),
  ];

  const severityRank: Record<HealthStatus, number> = { critical: 0, watch: 1, good: 2 };
  return insights.sort((a, b) => severityRank[a.severity] - severityRank[b.severity]);
}

function supplierConcentrationInsights({ inventory, suppliers }: ComputeInsightsInput): Insight[] {
  const exposure = valueBySupplier(inventory, suppliers);
  const top = exposure[0];
  if (!top || !top.supplierId || top.share < 50) return [];

  return [
    {
      id: "supplier-concentration",
      severity: "critical",
      title: "Dépendance fournisseur élevée",
      detail: `${top.supplierName} représente ${top.share.toFixed(0)}% de la valeur du stock du groupe. Diversifiez vos fournisseurs pour réduire ce risque.`,
      href: "/dashboard/suppliers",
    },
  ];
}

function unassignedArticleInsights({ inventory }: ComputeInsightsInput): Insight[] {
  const groups = unassignedBySite(inventory);
  if (groups.length === 0) return [];

  const totalUnassigned = groups.reduce((sum, g) => sum + g.items.length, 0);
  return [
    {
      id: "unassigned-articles",
      severity: totalUnassigned >= 5 ? "critical" : "watch",
      title: "Articles sans fournisseur assigné",
      detail: `${totalUnassigned} article(s) sans fournisseur, répartis sur ${groups.length} établissement(s) — risque d'approvisionnement.`,
      href: "/dashboard/suppliers",
    },
  ];
}

function perishablesExposureInsights({ inventory }: ComputeInsightsInput): Insight[] {
  const categories = valueByCategory(inventory);
  const frais = categories.find((c) => c.category === "frais");
  if (!frais || frais.share <= 40) return [];

  return [
    {
      id: "perishables-exposure",
      severity: "watch",
      title: "Forte exposition aux produits frais",
      detail: `Les produits frais représentent ${frais.share.toFixed(0)}% de la valeur du stock — risque de perte accru si la rotation ralentit.`,
    },
  ];
}

function siteHealthOutlierInsights({ inventory }: ComputeInsightsInput): Insight[] {
  const sites = siteHealth(inventory);
  const worst = sites
    .filter((s) => s.itemCount > 0)
    .sort((a, b) => b.unassignedShare - a.unassignedShare)[0];

  if (!worst || worst.unassignedShare < 40) return [];

  return [
    {
      id: "site-health-outlier",
      severity: worst.unassignedShare >= 70 ? "critical" : "watch",
      title: `${worst.siteName} nécessite une attention particulière`,
      detail: `${worst.unassignedShare.toFixed(0)}% des articles de ce site n'ont pas de fournisseur assigné.`,
      href: "/dashboard/suppliers",
    },
  ];
}

function revenueTrendInsights({ allDailySales }: ComputeInsightsInput): Insight[] {
  const points = aggregateRevenueByDate(allDailySales);
  if (points.length < 14) return [];

  const last7 = points.slice(-7);
  const prior7 = points.slice(-14, -7);
  const avg = (arr: typeof points) => arr.reduce((sum, p) => sum + p.netRevenue, 0) / arr.length;
  const lastAvg = avg(last7);
  const priorAvg = avg(prior7);
  if (priorAvg <= 0) return [];

  const pctChange = ((lastAvg - priorAvg) / priorAvg) * 100;
  if (pctChange >= -10) return [];

  return [
    {
      id: "revenue-trend-down",
      severity: "watch",
      title: "Baisse du chiffre d'affaires du groupe",
      detail: `Le CA moyen des 7 derniers jours a baissé de ${Math.abs(pctChange).toFixed(0)}% par rapport à la semaine précédente.`,
    },
  ];
}

function staffingGapInsights({ employees, sites }: ComputeInsightsInput): Insight[] {
  const gaps: Insight[] = [];
  for (const site of sites) {
    const siteEmployees = employees.filter((e) => e.siteId === site.id);
    const hasManager = siteEmployees.some((e) => e.role === "manager");
    const hasWaiter = siteEmployees.some((e) => e.role === "waiter");

    if (!hasManager) {
      gaps.push({
        id: `staffing-gap-manager-${site.id}`,
        severity: "critical",
        title: `${site.name} n'a aucun chef crêpier assigné`,
        detail: "Aucun compte manager n'est configuré pour cet établissement.",
        href: "/dashboard/employes",
      });
    }
    if (!hasWaiter) {
      gaps.push({
        id: `staffing-gap-waiter-${site.id}`,
        severity: "critical",
        title: `${site.name} n'a aucun serveur assigné`,
        detail: "Aucun compte serveur n'est configuré pour cet établissement.",
        href: "/dashboard/employes",
      });
    }
  }
  return gaps;
}

// Same-day reminder pending count — a lighter-weight companion to the
// "unassigned articles" rule, surfaced separately since it's operational
// (today's task) rather than structural (ongoing risk).
export function pendingReminderInsight(sitesWithPending: number): Insight | null {
  if (sitesWithPending === 0) return null;
  return {
    id: "pending-reminders",
    severity: sitesWithPending >= 3 ? "watch" : "good",
    title: "Établissements avec tâches en attente",
    detail: `${sitesWithPending} établissement(s) n'ont pas encore saisi les ventes du jour ou l'inventaire mensuel.`,
  };
}

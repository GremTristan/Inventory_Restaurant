/**
 * Detection + enrichment — RAW → INTERPRETATION → RECOMMENDATION.
 * Pure functions: no DB access. Callers feed already-loaded domain data.
 */

import type { InventoryItem, Order, Site, Tenant, User } from "@/types";
import { applyHarness, HARNESS } from "./harness";
import type { DirectorAction } from "./types";

function isLowStock(item: Pick<InventoryItem, "quantity" | "lowStockThreshold">): boolean {
  return item.lowStockThreshold !== null && item.quantity <= item.lowStockThreshold;
}

function isTenantUsable(tenant: Tenant): boolean {
  if (tenant.status === "active" || tenant.status === "past_due") return true;
  if (tenant.status === "trial") {
    return !tenant.trialEndsAt || new Date(tenant.trialEndsAt).getTime() > Date.now();
  }
  return false;
}

function trialDaysLeft(tenant: Tenant): number | null {
  if (tenant.status !== "trial" || !tenant.trialEndsAt) return null;
  return Math.max(0, Math.ceil((new Date(tenant.trialEndsAt).getTime() - Date.now()) / (24 * 60 * 60 * 1000)));
}

function fmtQty(n: number, unit: string): string {
  const v = Number.isInteger(n) ? String(n) : n.toFixed(1).replace(/\.0$/, "");
  return `${v} ${unit}`;
}

/** Suggest a restock quantity when we lack consumption history. */
export function recommendRestockQty(item: Pick<InventoryItem, "quantity" | "lowStockThreshold" | "unitsPerPackage">): number {
  const threshold = item.lowStockThreshold ?? 0;
  const target = Math.max(threshold * 2, threshold + (item.unitsPerPackage || 1));
  const need = Math.ceil(target - item.quantity);
  return Math.max(need, item.unitsPerPackage || 1);
}

/** Rough days-of-cover heuristic without movement history (medium confidence). */
export function estimateDaysLeft(item: Pick<InventoryItem, "quantity" | "lowStockThreshold">): number | null {
  if (item.lowStockThreshold === null || item.lowStockThreshold <= 0) return null;
  // Assume daily use ≈ threshold (common ops heuristic when no POS burn rate).
  const daily = Math.max(item.lowStockThreshold / 3, 0.1);
  return Math.max(0, Math.round((item.quantity / daily) * 10) / 10);
}

export function detectStockActions(input: {
  items: InventoryItem[];
  sites: Site[];
}): DirectorAction[] {
  const siteName = new Map(input.sites.map((s) => [s.id, s.name]));
  const low = input.items.filter(isLowStock);
  if (low.length === 0) return [];

  // Group by site for multi-site rollup.
  const bySite = new Map<string, InventoryItem[]>();
  for (const item of low) {
    const list = bySite.get(item.siteId) ?? [];
    list.push(item);
    bySite.set(item.siteId, list);
  }

  const actions: DirectorAction[] = [];
  for (const [siteId, siteItems] of bySite) {
    const critical = siteItems.filter((i) => i.quantity <= 0);
    const attention = siteItems.filter((i) => i.quantity > 0);
    const name = siteName.get(siteId) ?? "Établissement";
    const top = [...critical, ...attention]
      .sort((a, b) => a.quantity - b.quantity)
      .slice(0, HARNESS.maxStockLinesPerCard);

    const worst = top[0];
    const days = worst ? estimateDaysLeft(worst) : null;
    const rec = worst ? recommendRestockQty(worst) : null;
    const isCritical = critical.length > 0;

    actions.push({
      id: `stock:${siteId}`,
      kind: isCritical ? "stock_critical" : "stock_low",
      severity: isCritical ? "critical" : "attention",
      title: isCritical
        ? `${critical.length} rupture${critical.length > 1 ? "s" : ""} — ${name}`
        : `${siteItems.length} produit${siteItems.length > 1 ? "s" : ""} sous seuil — ${name}`,
      context: worst
        ? `${worst.name} · ${fmtQty(worst.quantity, worst.unit)}${
            days !== null ? ` · ~${days < 1 ? "<1" : days} j de stock` : ""
          }`
        : `${siteItems.length} articles à traiter`,
      recommendation:
        rec && worst
          ? `Action recommandée : commander ~${fmtQty(rec, worst.unit)} de ${worst.name}`
          : "Vérifier les quantités et passer commande",
      actionLabel: "Voir le stock",
      actionHref: `/direction/stock?site=${siteId}&focus=low`,
      evidence: top.map((i) => ({
        label: i.name,
        value: `${fmtQty(i.quantity, i.unit)} / seuil ${i.lowStockThreshold ?? "—"} ${i.unit}`,
      })),
      why: isCritical
        ? "Quantité à zéro ou négative : risque d’arrêt de production immédiat."
        : "Quantité ≤ seuil d’alerte défini pour cet article. Estimation des jours basée sur le seuil (pas encore sur la consommation réelle).",
      confidence: days !== null ? "medium" : "high",
      siteId,
      siteName: name,
      secondaryLabel: "Ouvrir la tablette stock",
      secondaryHref: `/s/${siteId}/stock`,
      rank: isCritical ? 10 : 20 + siteItems.length,
    });
  }
  return actions;
}

export function detectBillingActions(tenant: Tenant): DirectorAction[] {
  const usable = isTenantUsable(tenant);
  if (!usable) {
    return [
      {
        id: "billing:locked",
        kind: "billing_locked",
        severity: "critical",
        title: "Abonnement inactif — tablettes verrouillées",
        context: "Les équipes ne peuvent plus prendre de commandes tant que l’abonnement n’est pas réactivé.",
        recommendation: "Réactiver l’abonnement maintenant",
        actionLabel: "Réactiver",
        actionHref: "/direction/abonnement",
        evidence: [
          { label: "Statut", value: tenant.status },
          { label: "Formule", value: tenant.plan },
        ],
        why: "Le harness bloque l’accès opérationnel lorsque le tenant n’est plus utilisable (essai terminé, impayé ou suspendu).",
        confidence: "high",
        rank: 1,
      },
    ];
  }

  const days = trialDaysLeft(tenant);
  if (days !== null && days <= 5) {
    return [
      {
        id: "billing:trial",
        kind: "billing_risk",
        severity: days <= 2 ? "critical" : "attention",
        title: `Essai : ${days} jour${days > 1 ? "s" : ""} restant${days > 1 ? "s" : ""}`,
        context: "Sans formule choisie, les tablettes se verrouilleront à la fin de l’essai.",
        recommendation: "Choisir Essentiel ou Pro avant la fin de l’essai",
        actionLabel: "Choisir une formule",
        actionHref: "/direction/abonnement",
        evidence: [
          { label: "Fin d’essai", value: tenant.trialEndsAt ? new Date(tenant.trialEndsAt).toLocaleDateString("fr-CH") : "—" },
          { label: "Jours restants", value: String(days) },
        ],
        why: "Compte en période d’essai. Alerte anticipée pour éviter une coupure de service.",
        confidence: "high",
        rank: 5,
      },
    ];
  }
  return [];
}

export function detectSetupActions(input: {
  menuCount: number;
  staffCount: number;
  hasOrders: boolean;
  tenant: Tenant;
}): DirectorAction[] {
  const steps: DirectorAction[] = [];
  if (input.menuCount === 0) {
    steps.push({
      id: "setup:menu",
      kind: "setup_incomplete",
      severity: "attention",
      title: "Carte vide",
      context: "Aucun produit au menu — les tablettes ne peuvent pas prendre de commande.",
      recommendation: "Ajouter les crêpes et boissons de base",
      actionLabel: "Configurer le menu",
      actionHref: "/direction/menu",
      evidence: [{ label: "Produits menu", value: "0" }],
      why: "Sans carte, le pipeline commande → cuisine → caisse ne démarre pas.",
      confidence: "high",
      rank: 15,
    });
  }
  if (input.staffCount === 0) {
    steps.push({
      id: "setup:staff",
      kind: "setup_incomplete",
      severity: "attention",
      title: "Aucune équipe",
      context: "Ajoutez des serveurs et cuisiniers avec un code à 4 chiffres.",
      recommendation: "Créer au moins un serveur et un cuisinier",
      actionLabel: "Ajouter l’équipe",
      actionHref: "/direction/equipe",
      evidence: [{ label: "Comptes équipe", value: "0" }],
      why: "Les tablettes exigent un compte PIN pour ouvrir le service.",
      confidence: "high",
      rank: 16,
    });
  }
  if (!input.hasOrders && input.menuCount > 0 && input.staffCount > 0) {
    steps.push({
      id: "setup:first-order",
      kind: "setup_incomplete",
      severity: "info",
      title: "Première commande à passer",
      context: "Reliez une tablette avec le code établissement, puis créez une commande test.",
      recommendation: "Ouvrir un établissement et lancer le service",
      actionLabel: "Voir les établissements",
      actionHref: "/direction/etablissements",
      evidence: [{ label: "Commandes encaissées", value: "0" }],
      why: "Valide le pipeline bout-en-bout avant le service réel.",
      confidence: "high",
      rank: 40,
    });
  }
  return steps;
}

export function detectOpsBacklog(input: {
  sites: Site[];
  activeBySite: Order[][];
}): DirectorAction[] {
  const actions: DirectorAction[] = [];
  input.sites.forEach((site, index) => {
    const active = input.activeBySite[index] ?? [];
    const toPay = active.filter((o) => o.status === "served" || o.status === "ready");
    const inKitchen = active.filter((o) => o.status === "sent");
    if (toPay.length >= 3) {
      actions.push({
        id: `ops:pay:${site.id}`,
        kind: "ops_backlog",
        severity: toPay.length >= 6 ? "critical" : "attention",
        title: `${toPay.length} tickets à encaisser — ${site.name}`,
        context: "File d’attente caisse : risque de files et d’oublis.",
        recommendation: "Ouvrir la caisse et encaisser les tickets prêts",
        actionLabel: "Ouvrir la caisse",
        actionHref: `/s/${site.id}/caisse`,
        evidence: [
          { label: "À encaisser", value: String(toPay.length) },
          { label: "En cuisine", value: String(inKitchen.length) },
        ],
        why: "Plusieurs commandes sont prêtes/servies sans paiement. Seuil d’alerte = 3.",
        confidence: "high",
        siteId: site.id,
        siteName: site.name,
        rank: 12,
      });
    } else if (inKitchen.length >= 8) {
      actions.push({
        id: `ops:kitchen:${site.id}`,
        kind: "ops_backlog",
        severity: "attention",
        title: `Cuisine chargée — ${site.name}`,
        context: `${inKitchen.length} commandes en préparation.`,
        recommendation: "Surveiller l’écran cuisine",
        actionLabel: "Écran cuisine",
        actionHref: `/s/${site.id}/cuisine`,
        evidence: [{ label: "En préparation", value: String(inKitchen.length) }],
        why: "Charge cuisine élevée (seuil = 8). Aide à anticiper les retards.",
        confidence: "medium",
        siteId: site.id,
        siteName: site.name,
        rank: 25,
      });
    }
  });
  return actions;
}

export function detectInventoryReminder(input: {
  sites: Site[];
  pendingBySite: boolean[];
}): DirectorAction[] {
  const due = input.sites.filter((_, i) => input.pendingBySite[i]);
  if (due.length === 0) return [];
  if (due.length === 1) {
    const site = due[0];
    return [
      {
        id: `inv:${site.id}`,
        kind: "inventory_reminder",
        severity: "info",
        title: `Inventaire mensuel — ${site.name}`,
        context: "Pas encore validé ce mois-ci.",
        recommendation: "Continuer le comptage sur la tablette stock",
        actionLabel: "Ouvrir le stock",
        actionHref: `/s/${site.id}/stock`,
        evidence: [{ label: "Rappel", value: "Inventaire mensuel" }],
        why: "Rappel opérationnel mensuel non coché pour cet établissement.",
        confidence: "high",
        siteId: site.id,
        siteName: site.name,
        rank: 50,
      },
    ];
  }
  return [
    {
      id: "inv:multi",
      kind: "inventory_reminder",
      severity: "info",
      title: `Inventaire à faire — ${due.length} établissements`,
      context: due.map((s) => s.name).join(", "),
      recommendation: "Planifier le comptage sur chaque tablette",
      actionLabel: "Voir le stock",
      actionHref: "/direction/stock",
      evidence: due.map((s) => ({ label: s.name, value: "En attente" })),
      why: "Plusieurs sites n’ont pas encore marqué l’inventaire mensuel comme fait.",
      confidence: "high",
      rank: 50,
    },
  ];
}

export function buildDirectorSituation(input: {
  tenant: Tenant;
  sites: Site[];
  inventory: InventoryItem[];
  menuCount: number;
  staff: User[];
  hasOrders: boolean;
  activeBySite: Order[][];
  inventoryPendingBySite: boolean[];
}): { actions: DirectorAction[]; attentionCount: number } {
  const staffCount = input.staff.filter((u) => u.role !== "director").length;
  const raw = [
    ...detectBillingActions(input.tenant),
    ...detectSetupActions({
      menuCount: input.menuCount,
      staffCount,
      hasOrders: input.hasOrders,
      tenant: input.tenant,
    }),
    ...detectStockActions({ items: input.inventory, sites: input.sites }),
    ...detectOpsBacklog({ sites: input.sites, activeBySite: input.activeBySite }),
    ...detectInventoryReminder({ sites: input.sites, pendingBySite: input.inventoryPendingBySite }),
  ];

  const actions = applyHarness(raw);
  return { actions, attentionCount: actions.filter((a) => a.severity !== "info").length };
}

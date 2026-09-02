import type { Plan, Tenant } from "@/types";

export interface PlanDefinition {
  id: Plan;
  name: string;
  pricePerSite: number; // CHF / month / establishment, displayed only — Stripe holds the truth
  tagline: string;
  features: string[];
  maxSites: number | null;
  whiteLabel: boolean;
  exports: boolean;
}

export const PLANS: PlanDefinition[] = [
  {
    id: "essentiel",
    name: "Essentiel",
    pricePerSite: 49,
    tagline: "Pour une crêperie indépendante",
    features: ["Prise de commande et écran cuisine", "Caisse et tickets", "Stock avec alertes", "Rapports de ventes", "1 établissement"],
    maxSites: 1,
    whiteLabel: false,
    exports: false,
  },
  {
    id: "pro",
    name: "Pro",
    pricePerSite: 89,
    tagline: "Pour les chaînes et franchises",
    features: [
      "Tout Essentiel",
      "Établissements illimités, vue consolidée",
      "Comparaison entre établissements",
      "Export tableur / comptabilité",
      "Logo et couleurs à votre marque",
      "Décrément automatique du stock (recettes)",
    ],
    maxSites: null,
    whiteLabel: true,
    exports: true,
  },
];

export function planOf(tenant: Tenant): PlanDefinition {
  return PLANS.find((p) => p.id === tenant.plan) ?? PLANS[0];
}

// During the trial everything is open so the prospect sees the full product.
export function canUse(tenant: Tenant, feature: "whiteLabel" | "exports"): boolean {
  if (tenant.status === "trial") return true;
  return planOf(tenant)[feature];
}

export function siteLimit(tenant: Tenant): number | null {
  if (tenant.status === "trial") return null;
  return planOf(tenant).maxSites;
}

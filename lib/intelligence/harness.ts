/**
 * Harness — controls what the intelligence layer may surface.
 * Complex detection is allowed; the harness caps cognitive load and risk.
 */

import type { ActionConfidence, ActionSeverity, DirectorAction } from "./types";

export const HARNESS = {
  /** Max actions in the Accueil feed (exceptions only). */
  maxFeedItems: 8,
  /** Max stock lines expanded inside one grouped card. */
  maxStockLinesPerCard: 4,
  /** Never auto-create purchase orders — human confirmation required. */
  allowAutonomousPurchase: false,
  /** Decorative KPIs stay off the Accueil unless they unlock a decision. */
  showDecorativeKpis: false,
  /** Silence: if fewer than this many low-stock items at a site, still show them. */
  alwaysSurfaceCriticalStock: true,
} as const;

const SEVERITY_ORDER: Record<ActionSeverity, number> = {
  critical: 0,
  attention: 1,
  info: 2,
};

export function sortActions(actions: DirectorAction[]): DirectorAction[] {
  return [...actions].sort((a, b) => {
    const s = SEVERITY_ORDER[a.severity] - SEVERITY_ORDER[b.severity];
    if (s !== 0) return s;
    return a.rank - b.rank;
  });
}

export function applyHarness(actions: DirectorAction[]): DirectorAction[] {
  const sorted = sortActions(actions);
  return sorted.slice(0, HARNESS.maxFeedItems);
}

export function confidenceLabel(c: ActionConfidence): string {
  switch (c) {
    case "high":
      return "Confiance élevée (règle métier)";
    case "medium":
      return "Estimation";
    case "low":
      return "À vérifier";
  }
}

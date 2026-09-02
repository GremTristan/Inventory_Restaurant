/**
 * Intelligence layer types — OUTPUT of the data pipeline, INPUT of the UI.
 * Never expose raw warehouse rows as the primary mobile view.
 */

export type ActionSeverity = "critical" | "attention" | "info";

export type ActionKind =
  | "stock_critical"
  | "stock_low"
  | "setup_incomplete"
  | "billing_risk"
  | "billing_locked"
  | "ops_backlog"
  | "inventory_reminder"
  | "site_anomaly";

export type ActionConfidence = "high" | "medium" | "low";

export interface ActionEvidence {
  label: string;
  value: string;
}

export interface DirectorAction {
  id: string;
  kind: ActionKind;
  severity: ActionSeverity;
  /** Niveau 2 — what the system understands */
  title: string;
  /** Short context for the feed card */
  context: string;
  /** Recommended next step copy */
  recommendation?: string;
  /** Primary CTA */
  actionLabel: string;
  actionHref: string;
  /** Progressive disclosure */
  evidence: ActionEvidence[];
  why: string;
  confidence: ActionConfidence;
  /** Optional secondary deep link */
  secondaryLabel?: string;
  secondaryHref?: string;
  siteId?: string;
  siteName?: string;
  /** Sort key — lower = higher priority */
  rank: number;
}

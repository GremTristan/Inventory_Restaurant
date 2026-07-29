import type { HealthStatus } from "@/lib/inventory";

// Single source of truth for good/watch/critical presentation — consumed by
// StatusPill, ProgressRing, and the dashboard's inline stat/risk indicators,
// so a status always renders with the same color everywhere.
export const STATUS_DOT_CLASS: Record<HealthStatus, string> = {
  good: "bg-success",
  watch: "bg-warning",
  critical: "bg-destructive",
};

export const STATUS_BG_TEXT_CLASS: Record<HealthStatus, string> = {
  good: "bg-success/10 text-success",
  watch: "bg-warning/10 text-warning",
  critical: "bg-destructive/10 text-destructive",
};

// CSS variable references for contexts that need a raw color value rather
// than a Tailwind class (e.g. an SVG `stroke` attribute).
export const STATUS_COLOR_VAR: Record<HealthStatus, string> = {
  good: "var(--success)",
  watch: "var(--warning)",
  critical: "var(--destructive)",
};

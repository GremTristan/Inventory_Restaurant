import type { TenantStatus } from "@/types";

export const TENANT_STATUS_LABEL: Record<TenantStatus, { label: string; tone: string }> = {
  trial: { label: "Essai", tone: "bg-accent/15 text-accent" },
  active: { label: "Abonné", tone: "bg-success/15 text-success" },
  past_due: { label: "Impayé", tone: "bg-warning/20 text-warning" },
  canceled: { label: "Résilié", tone: "bg-muted text-muted-foreground" },
  suspended: { label: "Suspendu", tone: "bg-destructive/15 text-destructive" },
};

"use client";

import { useState } from "react";
import Link from "next/link";
import { ChevronDown, ChevronRight } from "lucide-react";
import { confidenceLabel } from "@/lib/intelligence/harness";
import type { DirectorAction } from "@/lib/intelligence/types";
import { cn } from "@/lib/utils";

const SEVERITY_DOT: Record<DirectorAction["severity"], string> = {
  critical: "bg-destructive",
  attention: "bg-warning",
  info: "bg-muted-foreground/40",
};

const SEVERITY_BORDER: Record<DirectorAction["severity"], string> = {
  critical: "border-destructive/30",
  attention: "border-warning/30",
  info: "border-border",
};

function ActionCard({ action }: { action: DirectorAction }) {
  const [open, setOpen] = useState(false);

  return (
    <article className={cn("rounded-lg border bg-card", SEVERITY_BORDER[action.severity])}>
      <div className="p-3.5">
        <div className="flex items-start gap-2.5">
          <span className={cn("mt-1.5 h-2 w-2 shrink-0 rounded-full", SEVERITY_DOT[action.severity])} aria-hidden />
          <div className="min-w-0 flex-1">
            <h3 className="text-[14px] font-semibold leading-snug tracking-tight text-foreground">{action.title}</h3>
            <p className="mt-0.5 text-[13px] leading-snug text-muted-foreground">{action.context}</p>
            {action.recommendation && (
              <p className="mt-2 text-[13px] font-medium text-foreground">{action.recommendation}</p>
            )}
          </div>
        </div>

        <div className="mt-3 flex flex-wrap gap-2">
          <Link
            href={action.actionHref}
            className="inline-flex h-10 min-w-[7.5rem] flex-1 items-center justify-center rounded-md bg-foreground px-3 text-[13px] font-medium text-background hover:bg-foreground/90 sm:flex-none"
          >
            {action.actionLabel}
          </Link>
          {action.secondaryHref && action.secondaryLabel && (
            <Link
              href={action.secondaryHref}
              className="inline-flex h-10 items-center justify-center rounded-md border border-border bg-card px-3 text-[13px] font-medium text-foreground hover:bg-muted"
            >
              {action.secondaryLabel}
            </Link>
          )}
          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            className="inline-flex h-10 items-center gap-1 rounded-md px-2.5 text-[13px] font-medium text-muted-foreground hover:bg-muted hover:text-foreground"
            aria-expanded={open}
          >
            {open ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
            Pourquoi ?
          </button>
        </div>
      </div>

      {open && (
        <div className="border-t border-border bg-muted/40 px-3.5 py-3 text-[12px] leading-relaxed text-muted-foreground">
          <p className="text-foreground">{action.why}</p>
          <p className="mt-2 font-medium text-muted-foreground">{confidenceLabel(action.confidence)}</p>
          {action.evidence.length > 0 && (
            <ul className="mt-2 space-y-1">
              {action.evidence.map((e) => (
                <li key={e.label} className="flex justify-between gap-3 font-mono text-[11px]">
                  <span className="truncate text-muted-foreground">{e.label}</span>
                  <span className="shrink-0 tabular-nums text-foreground">{e.value}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </article>
  );
}

export function ActionFeed({
  actions,
  emptyTitle = "Rien n’exige votre attention",
  emptyHint = "Les stocks, la caisse et l’abonnement sont sous contrôle. Les anomalies apparaîtront ici.",
}: {
  actions: DirectorAction[];
  emptyTitle?: string;
  emptyHint?: string;
}) {
  if (actions.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-border bg-card px-4 py-8 text-center">
        <p className="text-[14px] font-semibold text-foreground">{emptyTitle}</p>
        <p className="mx-auto mt-1 max-w-sm text-[13px] text-muted-foreground">{emptyHint}</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2.5">
      {actions.map((action) => (
        <ActionCard key={action.id} action={action} />
      ))}
    </div>
  );
}

export function AttentionSummary({
  criticalOrAttention,
  infoOnly,
}: {
  criticalOrAttention: number;
  infoOnly?: number;
}) {
  if (criticalOrAttention === 0 && (!infoOnly || infoOnly === 0)) {
    return (
      <p className="text-[13px] text-muted-foreground">
        <span className="mr-1.5 inline-block h-2 w-2 rounded-full bg-success align-middle" />
        Situation nominale
      </p>
    );
  }
  if (criticalOrAttention === 0 && infoOnly && infoOnly > 0) {
    return (
      <p className="text-[13px] text-muted-foreground">
        <span className="mr-1.5 inline-block h-2 w-2 rounded-full bg-muted-foreground/50 align-middle" />
        {infoOnly} rappel{infoOnly > 1 ? "s" : ""} — rien d’urgent
      </p>
    );
  }
  return (
    <p className="text-[13px] font-medium text-foreground">
      <span className="mr-1.5 inline-block h-2 w-2 rounded-full bg-destructive align-middle" />
      {criticalOrAttention} action{criticalOrAttention > 1 ? "s" : ""} nécessaire{criticalOrAttention > 1 ? "s" : ""}
    </p>
  );
}

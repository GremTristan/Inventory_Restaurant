import Link from "next/link";
import type { Site } from "@/types";
import { cn } from "@/lib/utils";

export function PageHeader({ title, description, action }: { title: string; description?: string; action?: React.ReactNode }) {
  return (
    <div className="mb-6 flex flex-wrap items-start justify-between gap-4 border-b border-border pb-5">
      <div className="min-w-0 max-w-2xl">
        <h1 className="text-[22px] font-semibold tracking-tight text-foreground">{title}</h1>
        {description && <p className="mt-1 text-[13px] leading-relaxed text-muted-foreground">{description}</p>}
      </div>
      {action}
    </div>
  );
}

export function Stat({ label, value, hint, tone }: { label: string; value: string; hint?: string; tone?: "accent" | "warning" | "destructive" }) {
  return (
    <div className="rounded-lg border border-border bg-card px-4 py-3.5">
      <p className="text-[11px] font-medium uppercase tracking-[0.04em] text-muted-foreground">{label}</p>
      <p
        className={cn(
          "mt-2 font-mono text-[22px] font-semibold leading-none tracking-tight tabular-nums",
          tone === "warning" && "text-warning",
          tone === "destructive" && "text-destructive",
          tone === "accent" && "text-accent",
          !tone && "text-foreground"
        )}
      >
        {value}
      </p>
      {hint && <p className="mt-2 text-[12px] leading-snug text-muted-foreground">{hint}</p>}
    </div>
  );
}

export function SiteTabs({
  sites,
  current,
  basePath,
  allLabel,
  query = {},
}: {
  sites: Site[];
  current: string | null;
  basePath: string;
  allLabel?: string;
  query?: Record<string, string>;
}) {
  const href = (site: string | null) => {
    const q = new URLSearchParams(query);
    if (site) q.set("site", site);
    const s = q.toString();
    return s ? `${basePath}?${s}` : basePath;
  };
  const tab = (href: string, label: string, active: boolean, key: string) => (
    <Link
      key={key}
      href={href}
      className={cn(
        "inline-flex h-8 shrink-0 items-center rounded-md border px-3 text-[12px] font-medium transition-colors",
        active
          ? "border-foreground bg-foreground text-background"
          : "border-border bg-card text-muted-foreground hover:bg-muted hover:text-foreground"
      )}
    >
      {label}
    </Link>
  );
  return (
    <div className="mb-5 flex gap-1.5 overflow-x-auto pb-0.5">
      {allLabel && tab(href(null), allLabel, current === null, "all")}
      {sites.map((site) => tab(href(site.id), site.name, current === site.id, site.id))}
    </div>
  );
}

export function EmptyState({ title, description, children }: { title: string; description?: string; children?: React.ReactNode }) {
  return (
    <div className="rounded-lg border border-dashed border-border bg-card px-6 py-12 text-center">
      <p className="text-[14px] font-medium text-foreground">{title}</p>
      {description && <p className="mx-auto mt-1.5 max-w-md text-[13px] leading-relaxed text-muted-foreground">{description}</p>}
      {children && <div className="mt-5 flex justify-center">{children}</div>}
    </div>
  );
}

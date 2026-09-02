import Link from "next/link";
import type { Site } from "@/types";
import { cn } from "@/lib/utils";

export function PageHeader({ title, description, action }: { title: string; description?: string; action?: React.ReactNode }) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
      <div className="min-w-0 max-w-2xl">
        <h1 className="text-[28px] font-bold leading-tight tracking-tight text-foreground">{title}</h1>
        {description && <p className="mt-1.5 text-[15px] leading-relaxed text-muted-foreground">{description}</p>}
      </div>
      {action}
    </div>
  );
}

export function Stat({ label, value, hint, tone }: { label: string; value: string; hint?: string; tone?: "accent" | "warning" | "destructive" }) {
  return (
    <div className="rounded-card bg-card p-5 shadow-[0_1px_2px_rgba(0,0,0,0.04),0_4px_16px_-4px_rgba(0,0,0,0.08)]">
      <p className="text-[13px] font-medium tracking-tight text-muted-foreground">{label}</p>
      <p
        className={cn(
          "mt-2 text-[28px] font-bold leading-none tracking-tight tabular-nums",
          tone === "warning" && "text-warning",
          tone === "destructive" && "text-destructive",
          tone === "accent" && "text-accent",
          !tone && "text-foreground"
        )}
      >
        {value}
      </p>
      {hint && <p className="mt-2 text-[13px] leading-snug text-muted-foreground">{hint}</p>}
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
        "min-h-10 inline-flex shrink-0 items-center rounded-pill px-4 text-[14px] font-semibold tracking-tight transition-colors",
        active ? "bg-accent text-accent-foreground" : "bg-card text-foreground shadow-sm hover:bg-muted"
      )}
    >
      {label}
    </Link>
  );
  return (
    <div className="mb-6 flex gap-2 overflow-x-auto pb-1">
      {allLabel && tab(href(null), allLabel, current === null, "all")}
      {sites.map((site) => tab(href(site.id), site.name, current === site.id, site.id))}
    </div>
  );
}

export function EmptyState({ title, description, children }: { title: string; description?: string; children?: React.ReactNode }) {
  return (
    <div className="rounded-card border border-dashed border-border bg-card/70 px-6 py-10 text-center">
      <p className="text-[17px] font-semibold tracking-tight text-foreground">{title}</p>
      {description && <p className="mx-auto mt-2 max-w-sm text-[15px] leading-relaxed text-muted-foreground">{description}</p>}
      {children && <div className="mt-5 flex justify-center">{children}</div>}
    </div>
  );
}

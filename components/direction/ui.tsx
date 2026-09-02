import Link from "next/link";
import type { Site } from "@/types";
import { cn } from "@/lib/utils";

export function PageHeader({ title, description, action }: { title: string; description?: string; action?: React.ReactNode }) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
      <div>
        <h1 className="text-2xl font-bold text-foreground sm:text-3xl">{title}</h1>
        {description && <p className="mt-1 text-sm text-muted-foreground">{description}</p>}
      </div>
      {action}
    </div>
  );
}

export function Stat({ label, value, hint, tone }: { label: string; value: string; hint?: string; tone?: "accent" | "warning" | "destructive" }) {
  return (
    <div className="rounded-card bg-card p-4 shadow-[0_1px_2px_rgba(20,24,27,0.04),0_8px_24px_-8px_rgba(20,24,27,0.08)] sm:p-5">
      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</p>
      <p
        className={cn(
          "mt-1 text-2xl font-bold tabular-nums sm:text-3xl",
          tone === "warning" && "text-warning",
          tone === "destructive" && "text-destructive",
          tone === "accent" && "text-accent",
          !tone && "text-foreground"
        )}
      >
        {value}
      </p>
      {hint && <p className="mt-1 text-xs text-muted-foreground">{hint}</p>}
    </div>
  );
}

// Site chooser as links (URL = state): shareable, back-button friendly,
// no client JS.
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
        "min-h-11 inline-flex shrink-0 items-center rounded-pill px-4 text-sm font-semibold transition-colors",
        active ? "bg-accent text-accent-foreground" : "bg-card text-foreground shadow-sm hover:bg-muted"
      )}
    >
      {label}
    </Link>
  );
  return (
    <div className="mb-5 flex gap-2 overflow-x-auto pb-1">
      {allLabel && tab(href(null), allLabel, current === null, "all")}
      {sites.map((site) => tab(href(site.id), site.name, current === site.id, site.id))}
    </div>
  );
}

export function EmptyState({ title, description, children }: { title: string; description?: string; children?: React.ReactNode }) {
  return (
    <div className="rounded-card border-2 border-dashed border-border p-8 text-center">
      <p className="text-base font-semibold text-foreground">{title}</p>
      {description && <p className="mt-1 text-sm text-muted-foreground">{description}</p>}
      {children && <div className="mt-4 flex justify-center">{children}</div>}
    </div>
  );
}

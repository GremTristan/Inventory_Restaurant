import type { HealthStatus } from "@/lib/inventory";
import { STATUS_DOT_CLASS } from "@/lib/status-styles";
import { cn } from "@/lib/utils";

export interface StatTileProps {
  label: string;
  value: string;
  status?: HealthStatus;
  trend?: { direction: "up" | "down" | "flat"; label: string };
  icon?: React.ReactNode;
  size?: "sm" | "md";
}

const TREND_ARROW: Record<"up" | "down" | "flat", string> = {
  up: "↑",
  down: "↓",
  flat: "→",
};

const TREND_CLASS: Record<"up" | "down" | "flat", string> = {
  up: "text-success",
  down: "text-destructive",
  flat: "text-muted-foreground",
};

export function StatTile({ label, value, status, trend, icon, size = "md" }: StatTileProps) {
  return (
    <div
      className={cn(
        "rounded-card bg-muted/60",
        size === "md" ? "px-4 py-4 sm:px-5 sm:py-5" : "px-4 py-3.5"
      )}
    >
      <div className="flex items-center gap-2">
        {status && <span className={cn("h-2 w-2 rounded-full", STATUS_DOT_CLASS[status])} />}
        {icon && (
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-accent/10 text-accent">
            {icon}
          </span>
        )}
        <span
          className={cn(
            "font-bold tabular-nums text-foreground",
            size === "md" ? "text-2xl sm:text-3xl" : "text-xl"
          )}
        >
          {value}
        </span>
      </div>
      <p className="mt-1 text-xs font-medium text-muted-foreground sm:text-sm">{label}</p>
      {trend && (
        <p className={cn("mt-1.5 text-xs font-semibold", TREND_CLASS[trend.direction])}>
          {TREND_ARROW[trend.direction]} {trend.label}
        </p>
      )}
    </div>
  );
}

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
    <div className={cn("rounded-xl bg-muted", size === "md" ? "px-4 py-3.5" : "px-4 py-3")}>
      <div className="flex items-center gap-1.5">
        {status && <span className={cn("h-1.5 w-1.5 rounded-full", STATUS_DOT_CLASS[status])} />}
        {icon && <span className="text-muted-foreground">{icon}</span>}
        <span
          className={cn(
            "font-semibold tabular-nums text-foreground",
            size === "md" ? "text-xl" : "text-lg"
          )}
        >
          {value}
        </span>
      </div>
      <p className="mt-0.5 text-xs text-muted-foreground">{label}</p>
      {trend && (
        <p className={cn("mt-1 text-xs font-medium", TREND_CLASS[trend.direction])}>
          {TREND_ARROW[trend.direction]} {trend.label}
        </p>
      )}
    </div>
  );
}

import type { HealthStatus } from "@/lib/inventory";
import { STATUS_BG_TEXT_CLASS, STATUS_DOT_CLASS } from "@/lib/status-styles";
import { cn } from "@/lib/utils";

export function StatusPill({ status, children }: { status: HealthStatus; children: React.ReactNode }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-pill px-3 py-1.5 text-xs font-semibold",
        STATUS_BG_TEXT_CLASS[status]
      )}
    >
      <span className={cn("h-1.5 w-1.5 rounded-full", STATUS_DOT_CLASS[status])} />
      {children}
    </span>
  );
}

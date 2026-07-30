import Link from "next/link";
import type { Insight } from "@/lib/ai-insights";
import { STATUS_DOT_CLASS } from "@/lib/status-styles";
import { cn } from "@/lib/utils";

export function InsightCard({ insight }: { insight: Insight }) {
  const content = (
    <div className="flex items-start gap-3 rounded-card bg-card px-4 py-3.5 shadow-[0_1px_2px_rgba(20,24,27,0.04),0_8px_24px_-8px_rgba(20,24,27,0.08)]">
      <span className={cn("mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full", STATUS_DOT_CLASS[insight.severity])} />
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium text-foreground">{insight.title}</p>
        <p className="mt-0.5 text-xs text-muted-foreground">{insight.detail}</p>
      </div>
      {insight.href && (
        <span aria-hidden="true" className="mt-0.5 shrink-0 text-accent">
          →
        </span>
      )}
    </div>
  );

  if (insight.href) {
    return (
      <Link href={insight.href} className="block transition-opacity hover:opacity-80">
        {content}
      </Link>
    );
  }

  return content;
}

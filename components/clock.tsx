"use client";

import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

// Client-only: server-rendered time would be frozen at request time and
// mismatch the browser's clock on hydration. Ticks every second so the
// display stays live without a full page reload.
export function Clock({ className, compact = false }: { className?: string; compact?: boolean }) {
  const [now, setNow] = useState<Date | null>(null);

  useEffect(() => {
    setNow(new Date());
    const interval = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(interval);
  }, []);

  if (!now) return null;

  const date = now.toLocaleDateString(
    "fr-CH",
    compact
      ? { day: "2-digit", month: "2-digit", year: "numeric" }
      : { weekday: "long", day: "2-digit", month: "long", year: "numeric" }
  );
  const time = now.toLocaleTimeString("fr-CH", {
    hour: "2-digit",
    minute: "2-digit",
    second: compact ? undefined : "2-digit",
  });

  return (
    <div className={cn("whitespace-nowrap text-muted-foreground", className)}>
      <span className={cn(!compact && "capitalize")}>{date}</span>
      <span className="mx-1.5">·</span>
      <span className="tabular-nums">{time}</span>
    </div>
  );
}

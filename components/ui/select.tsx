import { cn } from "@/lib/utils";
import type { SelectHTMLAttributes } from "react";

export function Select({ className, ...props }: SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      className={cn(
        "h-9 rounded-md border border-border bg-card px-3 text-[13px] tracking-tight text-foreground focus:border-foreground/30 focus:outline-none focus:ring-2 focus:ring-foreground/10",
        className
      )}
      {...props}
    />
  );
}

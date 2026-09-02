import { cn } from "@/lib/utils";
import type { SelectHTMLAttributes } from "react";

export function Select({ className, ...props }: SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      className={cn(
        "rounded-control border border-transparent bg-muted/80 px-4 py-3 text-[15px] tracking-tight text-foreground focus:border-accent focus:bg-card focus:outline-none focus:ring-2 focus:ring-accent/25",
        className
      )}
      {...props}
    />
  );
}

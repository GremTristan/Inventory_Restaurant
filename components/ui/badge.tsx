import { cn } from "@/lib/utils";
import type { HTMLAttributes } from "react";

export function Badge({ className, ...props }: HTMLAttributes<HTMLSpanElement>) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-md border border-border bg-muted px-1.5 py-0.5 font-mono text-[11px] font-medium text-muted-foreground",
        className
      )}
      {...props}
    />
  );
}

import { cn } from "@/lib/utils";
import type { HTMLAttributes } from "react";

export function Badge({ className, ...props }: HTMLAttributes<HTMLSpanElement>) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-sm bg-accent/10 px-2.5 py-0.5 text-xs font-medium uppercase tracking-wide text-accent",
        className
      )}
      {...props}
    />
  );
}

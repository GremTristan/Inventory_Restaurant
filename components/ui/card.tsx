import { cn } from "@/lib/utils";
import type { HTMLAttributes } from "react";

// Health-app cards float on white (soft shadow) rather than sit inside a
// hairline border — the single biggest visual signature of the redesign.
const CARD_SHADOW = "shadow-[0_1px_2px_rgba(20,24,27,0.04),0_8px_24px_-8px_rgba(20,24,27,0.08)]";

export function Card({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("rounded-card bg-card", CARD_SHADOW, className)} {...props} />;
}

export function CardHeader({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("flex flex-col gap-1 p-4 pb-2 sm:p-6 sm:pb-3", className)} {...props} />;
}

export function CardTitle({ className, ...props }: HTMLAttributes<HTMLHeadingElement>) {
  return <h3 className={cn("text-sm font-medium text-muted-foreground", className)} {...props} />;
}

export function CardContent({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("p-4 pt-0 sm:p-6 sm:pt-0", className)} {...props} />;
}

// Standardizes the "big bold number" treatment the redesign leans on
// throughout, so pages stop hand-writing ad hoc text-3xl/text-xl sizes.
export function CardBigNumber({ className, ...props }: HTMLAttributes<HTMLParagraphElement>) {
  return (
    <p
      className={cn("text-3xl font-bold tabular-nums text-foreground sm:text-4xl lg:text-5xl", className)}
      {...props}
    />
  );
}

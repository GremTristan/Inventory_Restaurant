import { cn } from "@/lib/utils";

export function NotificationDot({ className }: { className?: string }) {
  return (
    <span
      aria-hidden="true"
      className={cn("absolute -top-1 -right-2 h-2 w-2 rounded-full bg-destructive ring-2 ring-card", className)}
    />
  );
}

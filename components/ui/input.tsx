import { cn } from "@/lib/utils";
import type { InputHTMLAttributes, Ref } from "react";

// `ref` accepted as a plain prop (React 19 no longer requires forwardRef) —
// needed by components/avatar-widget.tsx, which imperatively writes a
// speech-to-text transcript into this input via a ref.
export function Input({
  className,
  ref,
  ...props
}: InputHTMLAttributes<HTMLInputElement> & { ref?: Ref<HTMLInputElement> }) {
  return (
    <input
      ref={ref}
      className={cn(
        "w-full rounded-md border border-border bg-card px-3 py-1.5 text-sm text-foreground placeholder:text-muted-foreground focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent",
        className
      )}
      {...props}
    />
  );
}

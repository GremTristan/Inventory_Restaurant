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
        "w-full rounded-control border border-transparent bg-muted px-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:border-accent focus:bg-card focus:outline-none focus:ring-2 focus:ring-accent/40",
        className
      )}
      {...props}
    />
  );
}

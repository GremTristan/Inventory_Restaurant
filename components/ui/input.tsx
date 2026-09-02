import { cn } from "@/lib/utils";
import type { InputHTMLAttributes, Ref } from "react";

// `ref` accepted as a plain prop (React 19 no longer requires forwardRef).
export function Input({
  className,
  ref,
  ...props
}: InputHTMLAttributes<HTMLInputElement> & { ref?: Ref<HTMLInputElement> }) {
  return (
    <input
      ref={ref}
      className={cn(
        "w-full rounded-control border border-transparent bg-muted/80 px-4 py-3 text-[15px] tracking-tight text-foreground placeholder:text-muted-foreground focus:border-accent focus:bg-card focus:outline-none focus:ring-2 focus:ring-accent/25",

        className
      )}
      {...props}
    />
  );
}

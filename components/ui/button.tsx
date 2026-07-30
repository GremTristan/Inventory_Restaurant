import { cn } from "@/lib/utils";
import type { ButtonHTMLAttributes } from "react";

type Variant = "primary" | "secondary" | "ghost" | "destructive";
type Size = "sm" | "md" | "lg" | "icon";

const variantClasses: Record<Variant, string> = {
  primary: "bg-accent text-accent-foreground hover:bg-accent-hover shadow-sm",
  secondary: "bg-muted text-foreground hover:bg-border/60",
  ghost: "text-muted-foreground hover:bg-muted hover:text-foreground",
  destructive: "text-destructive hover:bg-destructive/10",
};

// icon = 44px square, the minimum touch target for anything tappable on
// mobile (stepper/nav-adjacent icon-only buttons).
const sizeClasses: Record<Size, string> = {
  sm: "px-3 py-1.5 text-xs gap-1.5",
  md: "px-5 py-2.5 text-sm gap-2",
  lg: "px-6 py-3.5 text-base gap-2",
  icon: "h-11 w-11 p-0",
};

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
}

// Exported so non-<button> elements that need to look like a Button (e.g. a
// <Link> styled as a button — this codebase has no asChild/Slot pattern)
// can reuse the exact same classes instead of hand-duplicating them.
export function buttonClassName({
  variant = "primary",
  size = "md",
  className,
}: {
  variant?: Variant;
  size?: Size;
  className?: string;
} = {}) {
  return cn(
    "inline-flex items-center justify-center rounded-pill font-medium transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:opacity-50 disabled:pointer-events-none",
    variantClasses[variant],
    sizeClasses[size],
    className
  );
}

export function Button({ variant = "primary", size = "md", className, ...props }: ButtonProps) {
  return <button className={buttonClassName({ variant, size, className })} {...props} />;
}

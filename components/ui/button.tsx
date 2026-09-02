import { cn } from "@/lib/utils";
import type { ButtonHTMLAttributes } from "react";

type Variant = "primary" | "secondary" | "ghost" | "destructive" | "success" | "outline";
type Size = "sm" | "md" | "lg" | "xl" | "icon" | "icon-lg";

const variantClasses: Record<Variant, string> = {
  primary: "bg-accent text-accent-foreground hover:bg-accent-hover shadow-sm",
  secondary: "bg-muted text-foreground hover:bg-border/60",
  ghost: "text-muted-foreground hover:bg-muted hover:text-foreground",
  destructive: "bg-destructive text-destructive-foreground hover:bg-destructive/90 shadow-sm",
  success: "bg-success text-success-foreground hover:bg-success/90 shadow-sm",
  outline: "border-2 border-border bg-card text-foreground hover:border-accent hover:text-accent",
};

// Minimum 44px tall everywhere (thumb on a tablet); xl is the "can't miss
// it" primary action on staff screens (72px). active:scale gives instant
// tactile feedback before the server answers.
const sizeClasses: Record<Size, string> = {
  sm: "min-h-9 px-3 py-1.5 text-xs gap-1.5",
  md: "min-h-11 px-5 py-2.5 text-sm gap-2",
  lg: "min-h-14 px-6 py-3.5 text-base gap-2",
  xl: "min-h-[4.5rem] px-8 py-4 text-xl font-semibold gap-3",
  icon: "h-11 w-11 p-0",
  "icon-lg": "h-14 w-14 p-0 text-xl",
};

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
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
    "inline-flex select-none touch-manipulation items-center justify-center rounded-pill font-medium transition-[background-color,transform] duration-150 active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:opacity-50 disabled:pointer-events-none",
    variantClasses[variant],
    sizeClasses[size],
    className
  );
}

export function Button({ variant = "primary", size = "md", className, ...props }: ButtonProps) {
  return <button className={buttonClassName({ variant, size, className })} {...props} />;
}

import { cn } from "@/lib/utils";
import type { ButtonHTMLAttributes } from "react";

type Variant = "primary" | "secondary" | "ghost" | "destructive" | "success" | "outline";
type Size = "sm" | "md" | "lg" | "xl" | "icon" | "icon-lg";

const variantClasses: Record<Variant, string> = {
  primary: "bg-accent text-accent-foreground hover:bg-accent-hover shadow-sm",
  secondary: "bg-muted text-foreground hover:bg-border/50",
  ghost: "text-muted-foreground hover:bg-muted hover:text-foreground",
  destructive: "bg-destructive text-destructive-foreground hover:bg-destructive/90 shadow-sm",
  success: "bg-success text-success-foreground hover:bg-success/90 shadow-sm",
  outline: "border border-border bg-card text-foreground hover:border-accent hover:text-accent",
};

// Comfortable 44px+ targets with readable type — not kitchen-billboard, not cramped.
const sizeClasses: Record<Size, string> = {
  sm: "min-h-9 px-3 py-1.5 text-[13px] gap-1.5",
  md: "min-h-11 px-4 py-2.5 text-[15px] gap-2",
  lg: "min-h-12 px-5 py-3 text-[15px] gap-2",
  xl: "min-h-12 px-5 py-3 text-[15px] font-semibold gap-2 sm:min-h-14 sm:text-base",
  icon: "h-11 w-11 p-0",
  "icon-lg": "h-12 w-12 p-0",
};

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
}

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
    "inline-flex select-none touch-manipulation items-center justify-center rounded-pill font-semibold tracking-tight transition-[background-color,transform] duration-150 active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/35 focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:opacity-50 disabled:pointer-events-none",
    variantClasses[variant],
    sizeClasses[size],
    className
  );
}

export function Button({ variant = "primary", size = "md", className, ...props }: ButtonProps) {
  return <button className={buttonClassName({ variant, size, className })} {...props} />;
}

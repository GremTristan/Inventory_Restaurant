import { cn } from "@/lib/utils";
import { CATEGORY_COLORS, CATEGORY_LABELS } from "@/types";
import type { Category } from "@/types";

export function CategoryDot({ category, className }: { category: Category; className?: string }) {
  return (
    <span
      aria-hidden="true"
      className={cn("inline-block h-2 w-2 rounded-full", CATEGORY_COLORS[category].dot, className)}
    />
  );
}

// Tailwind v4 can't resolve a dynamic `bg-category-${category}` string at
// build time — an explicit lookup keeps the class names statically visible.
const CATEGORY_ICON_BG: Record<Category, string> = {
  frais: "bg-category-frais",
  sec: "bg-category-sec",
  sucre: "bg-category-sucre",
  viande: "bg-category-viande",
  boissons: "bg-category-boissons",
};

const ICON_SIZE_CLASS = {
  sm: "h-9 w-9 text-sm",
  md: "h-11 w-11 text-base",
  lg: "h-14 w-14 text-lg",
};

// The "colorful round icon" treatment — a filled circle with the category's
// initial, for section headers where an 8px CategoryDot would be too small
// to read as an icon (e.g. inventory category headers). CategoryDot stays
// the right choice for small inline-in-text usages elsewhere.
export function CategoryIcon({
  category,
  size = "md",
  className,
}: {
  category: Category;
  size?: "sm" | "md" | "lg";
  className?: string;
}) {
  return (
    <span
      aria-hidden="true"
      className={cn(
        "inline-flex shrink-0 items-center justify-center rounded-full font-bold text-white",
        ICON_SIZE_CLASS[size],
        CATEGORY_ICON_BG[category],
        className
      )}
    >
      {CATEGORY_LABELS[category].charAt(0)}
    </span>
  );
}

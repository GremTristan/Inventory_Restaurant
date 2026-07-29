import { cn } from "@/lib/utils";
import { CATEGORY_COLORS } from "@/types";
import type { Category } from "@/types";

export function CategoryDot({ category, className }: { category: Category; className?: string }) {
  return (
    <span
      aria-hidden="true"
      className={cn("inline-block h-2 w-2 rounded-full", CATEGORY_COLORS[category].dot, className)}
    />
  );
}

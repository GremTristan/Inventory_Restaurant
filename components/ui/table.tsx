import { cn } from "@/lib/utils";
import type { HTMLAttributes, TdHTMLAttributes, ThHTMLAttributes } from "react";

// Health apps essentially never use raw grid tables — this stays the
// desktop-only rendering (hidden below lg:, where there's real width for
// dense tabular data); table-heavy pages pair this with a mobile/tablet
// card list via ResponsiveDataList below.
export function Table({ className, children, ...props }: HTMLAttributes<HTMLTableElement>) {
  return (
    <div
      className={cn(
        "hidden overflow-hidden rounded-card bg-card shadow-[0_1px_2px_rgba(20,24,27,0.04),0_8px_24px_-8px_rgba(20,24,27,0.08)] lg:block",
        className
      )}
    >
      <table className="w-full text-sm" {...props}>
        {children}
      </table>
    </div>
  );
}

export function TableHeaderRow({ className, ...props }: HTMLAttributes<HTMLTableRowElement>) {
  return (
    <tr
      className={cn(
        "border-b border-border/60 bg-muted/50 text-left text-xs font-semibold tracking-wide text-muted-foreground",
        className
      )}
      {...props}
    />
  );
}

export function TableRow({ className, ...props }: HTMLAttributes<HTMLTableRowElement>) {
  return <tr className={cn("border-b border-border last:border-0", className)} {...props} />;
}

export function TableFootRow({ className, ...props }: HTMLAttributes<HTMLTableRowElement>) {
  return <tr className={cn("bg-muted", className)} {...props} />;
}

export function TableHead({ className, ...props }: ThHTMLAttributes<HTMLTableCellElement>) {
  return <th className={cn("px-4 py-2.5 font-medium", className)} {...props} />;
}

export function TableCell({ className, ...props }: TdHTMLAttributes<HTMLTableCellElement>) {
  return <td className={cn("px-4 py-2", className)} {...props} />;
}

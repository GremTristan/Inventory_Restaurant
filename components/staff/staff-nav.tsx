"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChefHat, ClipboardList, Package, PlusCircle, Wallet, type LucideIcon } from "lucide-react";
import type { StaffTab, StaffTabKey } from "@/lib/staff-tabs";
import { cn } from "@/lib/utils";

const ICONS: Record<StaffTabKey, LucideIcon> = {
  service: ClipboardList,
  commande: PlusCircle,
  caisse: Wallet,
  cuisine: ChefHat,
  stock: Package,
};

// iOS-like tab bar: clear icons, readable labels, room to breathe.
export function StaffNav({ tabs }: { tabs: StaffTab[] }) {
  const pathname = usePathname();
  return (
    <nav
      aria-label="Navigation"
      className="no-print fixed inset-x-0 bottom-0 z-40 flex items-stretch justify-around border-t border-border/80 bg-card/95 pb-[env(safe-area-inset-bottom)] backdrop-blur-xl lg:static lg:inset-auto lg:border-0 lg:bg-transparent lg:pb-0"
    >
      {tabs.map((tab) => {
        const active = pathname === tab.href || pathname.startsWith(`${tab.href}/`);
        const Icon = ICONS[tab.key];
        return (
          <Link
            key={tab.href}
            href={tab.href}
            className={cn(
              "relative flex min-h-[3.5rem] flex-1 flex-col items-center justify-center gap-1 px-2 text-[11px] font-semibold tracking-tight lg:min-h-11 lg:flex-none lg:flex-row lg:gap-2 lg:rounded-pill lg:px-4 lg:text-[14px]",
              active ? "text-accent lg:bg-accent/10" : "text-muted-foreground hover:text-foreground"
            )}
          >
            <Icon className={cn("h-5 w-5 stroke-[1.75]", active && "stroke-2")} />
            <span className="leading-none">{tab.label}</span>
            {tab.badge ? (
              <span className="absolute right-[calc(50%-1.5rem)] top-1.5 flex h-4 min-w-4 items-center justify-center rounded-pill bg-destructive px-1 text-[10px] font-bold text-destructive-foreground lg:static lg:ml-1">
                {tab.badge}
              </span>
            ) : null}
          </Link>
        );
      })}
    </nav>
  );
}

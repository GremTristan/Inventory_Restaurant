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

// Bottom tab bar on tablets/phones, inline on wide screens. Big targets.
export function StaffNav({ tabs }: { tabs: StaffTab[] }) {
  const pathname = usePathname();
  return (
    <nav
      aria-label="Navigation"
      className="no-print fixed inset-x-0 bottom-0 z-40 flex items-stretch justify-around border-t border-border bg-card/95 pb-[env(safe-area-inset-bottom)] backdrop-blur lg:static lg:inset-auto lg:border-0 lg:bg-transparent lg:pb-0"
    >
      {tabs.map((tab) => {
        const active = pathname === tab.href || pathname.startsWith(`${tab.href}/`);
        const Icon = ICONS[tab.key];
        return (
          <Link
            key={tab.href}
            href={tab.href}
            className={cn(
              "relative flex min-h-16 flex-1 flex-col items-center justify-center gap-1 px-2 text-xs font-semibold lg:min-h-12 lg:flex-none lg:flex-row lg:gap-2 lg:rounded-pill lg:px-4 lg:text-sm",
              active ? "text-accent lg:bg-accent/10" : "text-muted-foreground hover:text-foreground"
            )}
          >
            <Icon className="h-6 w-6 lg:h-5 lg:w-5" />
            {tab.label}
            {tab.badge ? (
              <span className="absolute right-[calc(50%-1.75rem)] top-1.5 flex h-5 min-w-5 items-center justify-center rounded-pill bg-destructive px-1 text-[11px] font-bold text-destructive-foreground lg:static lg:ml-1">
                {tab.badge}
              </span>
            ) : null}
          </Link>
        );
      })}
    </nav>
  );
}

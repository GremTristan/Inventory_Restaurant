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

export function StaffNav({ tabs }: { tabs: StaffTab[] }) {
  const pathname = usePathname();
  return (
    <nav
      aria-label="Navigation"
      className="no-print fixed inset-x-0 bottom-0 z-40 flex items-stretch justify-around border-t border-border bg-card pb-[env(safe-area-inset-bottom)] lg:static lg:inset-auto lg:gap-1 lg:border-0 lg:bg-transparent lg:pb-0"
    >
      {tabs.map((tab) => {
        const active = pathname === tab.href || pathname.startsWith(`${tab.href}/`);
        const Icon = ICONS[tab.key];
        return (
          <Link
            key={tab.href}
            href={tab.href}
            className={cn(
              "relative flex min-h-14 flex-1 flex-col items-center justify-center gap-1 px-1 text-[10px] font-medium tracking-tight lg:min-h-9 lg:flex-none lg:flex-row lg:gap-2 lg:rounded-md lg:px-3 lg:text-[13px]",
              active ? "text-foreground lg:bg-muted" : "text-muted-foreground hover:text-foreground"
            )}
          >
            <Icon className={cn("h-[18px] w-[18px] stroke-[1.6]", active && "text-accent")} />
            <span>{tab.label}</span>
            {tab.badge ? (
              <span className="absolute right-[calc(50%-1.35rem)] top-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-destructive px-1 font-mono text-[10px] font-semibold text-destructive-foreground lg:static lg:ml-0.5">
                {tab.badge}
              </span>
            ) : null}
          </Link>
        );
      })}
    </nav>
  );
}

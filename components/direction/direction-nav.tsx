"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BarChart3,
  CreditCard,
  LayoutDashboard,
  Package,
  Settings,
  Store,
  Users,
  UtensilsCrossed,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";

const ITEMS: { href: string; label: string; icon: LucideIcon; mobile?: boolean }[] = [
  { href: "/direction", label: "Overview", icon: LayoutDashboard, mobile: true },
  { href: "/direction/ventes", label: "Ventes", icon: BarChart3, mobile: true },
  { href: "/direction/menu", label: "Menu", icon: UtensilsCrossed, mobile: true },
  { href: "/direction/stock", label: "Stock", icon: Package },
  { href: "/direction/equipe", label: "Équipe", icon: Users, mobile: true },
  { href: "/direction/etablissements", label: "Sites", icon: Store },
  { href: "/direction/abonnement", label: "Billing", icon: CreditCard },
  { href: "/direction/reglages", label: "Settings", icon: Settings, mobile: true },
];

function isActive(pathname: string, href: string) {
  return href === "/direction" ? pathname === href : pathname.startsWith(href);
}

export function DirectionSidebarNav() {
  const pathname = usePathname();
  return (
    <nav className="flex flex-col gap-0.5">
      {ITEMS.map(({ href, label, icon: Icon }) => (
        <Link
          key={href}
          href={href}
          className={cn(
            "flex h-9 items-center gap-2.5 rounded-md px-2.5 text-[13px] font-medium tracking-tight transition-colors",
            isActive(pathname, href)
              ? "bg-muted text-foreground"
              : "text-muted-foreground hover:bg-muted/70 hover:text-foreground"
          )}
        >
          <Icon className="h-4 w-4 stroke-[1.6]" />
          {label}
        </Link>
      ))}
    </nav>
  );
}

export function DirectionMobileNav() {
  const pathname = usePathname();
  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 flex items-stretch justify-around border-t border-border bg-card pb-[env(safe-area-inset-bottom)] md:hidden">
      {ITEMS.filter((i) => i.mobile).map(({ href, label, icon: Icon }) => (
        <Link
          key={href}
          href={href}
          className={cn(
            "flex min-h-14 flex-1 flex-col items-center justify-center gap-1 text-[10px] font-medium tracking-tight",
            isActive(pathname, href) ? "text-foreground" : "text-muted-foreground"
          )}
        >
          <Icon className={cn("h-[18px] w-[18px] stroke-[1.6]", isActive(pathname, href) && "text-accent")} />
          <span>{label}</span>
        </Link>
      ))}
    </nav>
  );
}

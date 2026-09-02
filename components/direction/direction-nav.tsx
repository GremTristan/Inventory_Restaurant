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
  { href: "/direction", label: "Accueil", icon: LayoutDashboard, mobile: true },
  { href: "/direction/ventes", label: "Ventes", icon: BarChart3, mobile: true },
  { href: "/direction/menu", label: "Menu", icon: UtensilsCrossed, mobile: true },
  { href: "/direction/stock", label: "Stock", icon: Package },
  { href: "/direction/equipe", label: "Équipe", icon: Users, mobile: true },
  { href: "/direction/etablissements", label: "Établissements", icon: Store },
  { href: "/direction/abonnement", label: "Abonnement", icon: CreditCard },
  { href: "/direction/reglages", label: "Réglages", icon: Settings, mobile: true },
];

function isActive(pathname: string, href: string) {
  return href === "/direction" ? pathname === href : pathname.startsWith(href);
}

export function DirectionSidebarNav() {
  const pathname = usePathname();
  return (
    <nav className="flex flex-col gap-1.5">
      {ITEMS.map(({ href, label, icon: Icon }) => (
        <Link
          key={href}
          href={href}
          className={cn(
            "flex min-h-11 items-center gap-3 rounded-pill px-3 text-[14px] font-medium tracking-tight transition-colors",
            isActive(pathname, href)
              ? "bg-sidebar-accent text-sidebar-foreground"
              : "text-sidebar-muted-foreground hover:bg-sidebar-accent/60 hover:text-sidebar-foreground"
          )}
        >
          <Icon className="h-5 w-5 stroke-[1.75]" />
          {label}
        </Link>
      ))}
    </nav>
  );
}

export function DirectionMobileNav() {
  const pathname = usePathname();
  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 flex items-stretch justify-around border-t border-border/80 bg-card/95 pb-[env(safe-area-inset-bottom)] backdrop-blur-xl md:hidden">
      {ITEMS.filter((i) => i.mobile).map(({ href, label, icon: Icon }) => (
        <Link
          key={href}
          href={href}
          className={cn(
            "flex min-h-[3.5rem] flex-1 flex-col items-center justify-center gap-1 text-[11px] font-semibold tracking-tight",
            isActive(pathname, href) ? "text-accent" : "text-muted-foreground"
          )}
        >
          <Icon className={cn("h-5 w-5 stroke-[1.75]", isActive(pathname, href) && "stroke-2")} />
          <span className="leading-none">{label}</span>
        </Link>
      ))}
    </nav>
  );
}

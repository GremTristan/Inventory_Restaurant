"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, Package, ShoppingBag, Truck, UtensilsCrossed, Users } from "lucide-react";
import { ROLE_LABELS, type User } from "@/types";
import { logoutAction } from "@/lib/actions";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { NotificationDot } from "@/components/ui/notification-dot";
import { Clock } from "@/components/clock";
import { cn } from "@/lib/utils";

interface NavItem {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  showDot?: boolean;
}

function navLinkClass() {
  return "rounded-pill px-3 py-2 text-sm text-sidebar-muted-foreground transition-colors hover:bg-sidebar-accent hover:text-sidebar-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent";
}

function useNavItems(user: User, hasOwnPendingReminder?: boolean): NavItem[] {
  if (user.role === "director") {
    return [
      { href: "/dashboard", label: "Tableau de bord", icon: LayoutDashboard },
      { href: "/dashboard/suppliers", label: "Fournisseurs", icon: Truck },
      { href: "/dashboard/menu", label: "Menu", icon: UtensilsCrossed },
      { href: "/dashboard/employes", label: "Employés", icon: Users },
    ];
  }
  return [
    {
      href: `/inventory/${user.siteId}`,
      label: "Inventaire",
      icon: Package,
      showDot: user.role === "manager" && hasOwnPendingReminder,
    },
    {
      href: `/inventory/${user.siteId}/sales`,
      label: "Ventes du jour",
      icon: ShoppingBag,
      showDot: user.role === "waiter" && hasOwnPendingReminder,
    },
  ];
}

export function Sidebar({
  user,
  hasOwnPendingReminder,
}: {
  user: User;
  // For manager/waiter: whether the one reminder they're responsible for
  // (monthly inventory / daily sales, respectively) is still pending —
  // drives the dot on their own "Inventaire"/"Ventes du jour" tab.
  hasOwnPendingReminder?: boolean;
}) {
  const pathname = usePathname();
  const navItems = useNavItems(user, hasOwnPendingReminder);
  const homeHref = user.role === "director" ? "/dashboard" : `/inventory/${user.siteId}`;

  return (
    <>
      {/* Desktop sidebar — unchanged structurally, restyled only */}
      <aside className="hidden md:flex md:w-64 md:shrink-0 md:flex-col md:border-r md:border-sidebar-border md:bg-sidebar-background md:px-4 md:py-6">
        <Link
          href={homeHref}
          className="rounded-sm px-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
        >
          <span className="text-sm font-semibold uppercase tracking-wide text-sidebar-foreground">
            Crêperies Group
          </span>
        </Link>

        <nav className="mt-8 flex flex-1 flex-col gap-1">
          {navItems.map((item) => (
            <span key={item.href} className="relative inline-flex">
              <Link href={item.href} className={navLinkClass()}>
                {item.label}
              </Link>
              {item.showDot && <NotificationDot />}
            </span>
          ))}
          <span className="mt-1 flex items-center justify-between rounded-pill px-3 py-2 text-sm text-sidebar-muted-foreground opacity-60">
            CRM
            <span className="rounded-pill bg-sidebar-accent px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-sidebar-muted-foreground">
              Bientôt
            </span>
          </span>
        </nav>

        <div className="mt-auto flex flex-col gap-3 border-t border-sidebar-border pt-4">
          <Clock compact className="px-1 text-xs text-sidebar-muted-foreground" />
          <div className="flex items-center justify-between px-1">
            <div className="flex flex-col">
              <span className="text-sm font-medium text-sidebar-foreground">{user.name}</span>
              <Badge className="mt-1 w-fit bg-sidebar-accent text-sidebar-foreground">
                {ROLE_LABELS[user.role]}
              </Badge>
            </div>
          </div>
          <form action={logoutAction}>
            <Button
              type="submit"
              variant="ghost"
              size="sm"
              className="w-full justify-start px-1 text-xs text-sidebar-muted-foreground hover:text-sidebar-foreground"
            >
              Déconnexion
            </Button>
          </form>
        </div>
      </aside>

      {/* Mobile top bar — trimmed to branding/role/logout, nav links moved
          to the fixed bottom tab bar below */}
      <header className="flex items-center justify-between border-b border-border bg-card px-4 py-3 md:hidden">
        <Link href={homeHref}>
          <span className="text-sm font-bold text-accent">Crêperies Group</span>
        </Link>
        <div className="flex items-center gap-2">
          <Badge>{ROLE_LABELS[user.role]}</Badge>
          <form action={logoutAction}>
            <Button type="submit" variant="ghost" size="sm">
              Déconnexion
            </Button>
          </form>
        </div>
      </header>

      {/* Mobile bottom tab bar — fixed, safe-area aware. With 2-4 items per
          role, everything fits without the scrolling-pill-row this
          replaces. */}
      <nav
        className="fixed inset-x-0 bottom-0 z-40 flex items-center justify-around border-t border-border bg-card/95 pb-[env(safe-area-inset-bottom)] backdrop-blur md:hidden"
        aria-label="Navigation principale"
      >
        {navItems.map((item) => {
          const isActive = pathname === item.href;
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "relative flex flex-1 flex-col items-center gap-1 py-2.5 text-muted-foreground",
                isActive && "text-accent"
              )}
            >
              <span className="flex h-7 w-7 items-center justify-center">
                <Icon className="h-6 w-6" />
              </span>
              <span className="text-[11px] font-medium">{item.label}</span>
              {item.showDot && <NotificationDot className="right-1/3 top-1" />}
            </Link>
          );
        })}
      </nav>
    </>
  );
}

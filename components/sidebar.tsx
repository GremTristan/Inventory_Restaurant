import Link from "next/link";
import { ROLE_LABELS, type User } from "@/types";
import { logoutAction } from "@/lib/actions";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { NotificationDot } from "@/components/ui/notification-dot";
import { Clock } from "@/components/clock";
import { cn } from "@/lib/utils";

function navLinkClass() {
  return "rounded-md px-3 py-2 text-sm text-sidebar-muted-foreground transition-colors hover:bg-sidebar-accent hover:text-sidebar-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent";
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
  const navContent = (
    <nav className="flex flex-1 flex-col gap-1">
      {user.role === "director" && (
        <>
          <Link href="/dashboard" className={navLinkClass()}>
            Tableau de bord
          </Link>
          <Link href="/dashboard/suppliers" className={navLinkClass()}>
            Fournisseurs
          </Link>
          <Link href="/dashboard/menu" className={navLinkClass()}>
            Menu
          </Link>
          <Link href="/dashboard/employes" className={navLinkClass()}>
            Employés
          </Link>
        </>
      )}
      {(user.role === "manager" || user.role === "waiter") && (
        <>
          <span className="relative inline-flex">
            <Link href={`/inventory/${user.siteId}`} className={navLinkClass()}>
              Inventaire
            </Link>
            {user.role === "manager" && hasOwnPendingReminder && <NotificationDot />}
          </span>
          <span className="relative inline-flex">
            <Link href={`/inventory/${user.siteId}/sales`} className={navLinkClass()}>
              Ventes du jour
            </Link>
            {user.role === "waiter" && hasOwnPendingReminder && <NotificationDot />}
          </span>
        </>
      )}
      <span
        className={cn(
          "mt-1 flex items-center justify-between rounded-md px-3 py-2 text-sm text-sidebar-muted-foreground opacity-60"
        )}
      >
        CRM
        <span className="rounded-sm bg-sidebar-accent px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-sidebar-muted-foreground">
          Bientôt
        </span>
      </span>
    </nav>
  );

  return (
    <>
      {/* Desktop sidebar */}
      <aside className="hidden md:flex md:w-64 md:shrink-0 md:flex-col md:border-r md:border-sidebar-border md:bg-sidebar-background md:px-4 md:py-6">
        <Link
          href={user.role === "director" ? "/dashboard" : `/inventory/${user.siteId}`}
          className="rounded-sm px-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
        >
          <span className="text-sm font-semibold uppercase tracking-wide text-sidebar-foreground">
            Crêperies Group
          </span>
        </Link>

        <div className="mt-8">{navContent}</div>

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
              className="w-full justify-start px-1 text-xs text-sidebar-muted-foreground hover:text-sidebar-foreground"
            >
              Déconnexion
            </Button>
          </form>
        </div>
      </aside>

      {/* Mobile top bar */}
      <header className="border-b border-border bg-card md:hidden">
        <div className="flex items-center justify-between px-4 py-3">
          <Link href={user.role === "director" ? "/dashboard" : `/inventory/${user.siteId}`}>
            <span className="text-sm font-semibold uppercase tracking-wide text-accent">Crêperies Group</span>
          </Link>
          <div className="flex items-center gap-2">
            <Badge>{ROLE_LABELS[user.role]}</Badge>
            <form action={logoutAction}>
              <Button type="submit" variant="ghost" className="px-2 py-1 text-xs">
                Déconnexion
              </Button>
            </form>
          </div>
        </div>
        <nav className="flex items-center gap-4 overflow-x-auto px-4 pb-3 text-sm text-muted-foreground">
          {user.role === "director" && (
            <>
              <Link href="/dashboard" className="whitespace-nowrap hover:text-foreground">
                Tableau de bord
              </Link>
              <Link href="/dashboard/suppliers" className="whitespace-nowrap hover:text-foreground">
                Fournisseurs
              </Link>
              <Link href="/dashboard/menu" className="whitespace-nowrap hover:text-foreground">
                Menu
              </Link>
              <Link href="/dashboard/employes" className="whitespace-nowrap hover:text-foreground">
                Employés
              </Link>
            </>
          )}
          {(user.role === "manager" || user.role === "waiter") && (
            <>
              <span className="relative inline-flex">
                <Link href={`/inventory/${user.siteId}`} className="whitespace-nowrap hover:text-foreground">
                  Inventaire
                </Link>
                {user.role === "manager" && hasOwnPendingReminder && <NotificationDot />}
              </span>
              <span className="relative inline-flex">
                <Link href={`/inventory/${user.siteId}/sales`} className="whitespace-nowrap hover:text-foreground">
                  Ventes du jour
                </Link>
                {user.role === "waiter" && hasOwnPendingReminder && <NotificationDot />}
              </span>
            </>
          )}
        </nav>
      </header>
    </>
  );
}

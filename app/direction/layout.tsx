import Link from "next/link";
import { LogOut } from "lucide-react";
import { BrandMark, BrandScope } from "@/components/brand";
import { DirectionMobileNav, DirectionSidebarNav } from "@/components/direction/direction-nav";
import { logoutAction } from "@/lib/auth/actions";
import { pageDirector } from "@/lib/page-guards";
import { isTenantUsable, trialDaysLeft } from "@/lib/tenant-store";

export default async function DirectionLayout({ children }: { children: React.ReactNode }) {
  const { user, tenant } = await pageDirector({ allowInactiveTenant: true });
  const daysLeft = trialDaysLeft(tenant);
  const usable = isTenantUsable(tenant);

  return (
    <BrandScope tenant={tenant}>
      <div className="flex min-h-screen flex-col bg-background md:flex-row">
        <aside className="hidden md:flex md:w-64 md:shrink-0 md:flex-col md:bg-sidebar-background md:px-4 md:py-6">
          <div className="px-2 text-sidebar-foreground [&_span]:text-sidebar-foreground">
            <BrandMark tenant={tenant} href="/direction" />
          </div>
          <div className="mt-8 flex-1">
            <DirectionSidebarNav />
          </div>
          <div className="mt-6 border-t border-sidebar-border pt-4">
            <p className="truncate px-2 text-sm font-semibold text-sidebar-foreground">{user.name}</p>
            <p className="truncate px-2 text-xs text-sidebar-muted-foreground">{user.email}</p>
            <form action={logoutAction} className="mt-2">
              <button
                type="submit"
                className="flex min-h-10 w-full items-center gap-2 rounded-pill px-2 text-sm text-sidebar-muted-foreground hover:bg-sidebar-accent hover:text-sidebar-foreground"
              >
                <LogOut className="h-4 w-4" /> Déconnexion
              </button>
            </form>
          </div>
        </aside>

        <div className="flex min-w-0 flex-1 flex-col">
          <header className="flex items-center justify-between border-b border-border bg-card px-4 py-2 md:hidden">
            <BrandMark tenant={tenant} href="/direction" />
            <form action={logoutAction}>
              <button type="submit" className="flex h-11 w-11 items-center justify-center rounded-pill text-muted-foreground" aria-label="Déconnexion">
                <LogOut className="h-5 w-5" />
              </button>
            </form>
          </header>

          {(daysLeft !== null || !usable) && (
            <div
              className={
                usable
                  ? "flex flex-wrap items-center justify-center gap-x-3 gap-y-1 bg-accent/10 px-4 py-2 text-center text-sm text-foreground"
                  : "flex flex-wrap items-center justify-center gap-x-3 gap-y-1 bg-destructive px-4 py-2 text-center text-sm font-semibold text-destructive-foreground"
              }
            >
              {usable ? (
                <>
                  Essai gratuit : <strong>{daysLeft} jour{daysLeft === 1 ? "" : "s"}</strong> restant{daysLeft === 1 ? "" : "s"}.
                  <Link href="/direction/abonnement" className="font-semibold text-accent underline">
                    Choisir mon abonnement
                  </Link>
                </>
              ) : (
                <>
                  Votre abonnement est inactif : les tablettes sont bloquées.
                  <Link href="/direction/abonnement" className="underline">
                    Réactiver
                  </Link>
                </>
              )}
            </div>
          )}

          <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-6 pb-24 sm:px-6 md:pb-8">{children}</main>
        </div>
        <DirectionMobileNav />
      </div>
    </BrandScope>
  );
}

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
        <aside className="hidden md:flex md:w-64 md:shrink-0 md:flex-col md:bg-sidebar-background md:px-4 md:py-7">
          <div className="px-2 text-sidebar-foreground [&_span]:text-sidebar-foreground">
            <BrandMark tenant={tenant} href="/direction" />
          </div>
          <div className="mt-10 flex-1">
            <DirectionSidebarNav />
          </div>
          <div className="mt-8 border-t border-sidebar-border pt-5">
            <p className="truncate px-2 text-[14px] font-semibold tracking-tight text-sidebar-foreground">{user.name}</p>
            <p className="truncate px-2 text-[12px] text-sidebar-muted-foreground">{user.email}</p>
            <form action={logoutAction} className="mt-3">
              <button
                type="submit"
                className="flex min-h-11 w-full items-center gap-2 rounded-pill px-2 text-[13px] text-sidebar-muted-foreground hover:bg-sidebar-accent hover:text-sidebar-foreground"
              >
                <LogOut className="h-4 w-4" /> Déconnexion
              </button>
            </form>
          </div>
        </aside>

        <div className="flex min-w-0 flex-1 flex-col">
          <header className="flex items-center justify-between border-b border-border/80 bg-card/90 px-4 py-3 backdrop-blur-xl md:hidden">
            <BrandMark tenant={tenant} href="/direction" />
            <form action={logoutAction}>
              <button type="submit" className="flex h-10 w-10 items-center justify-center rounded-pill text-muted-foreground" aria-label="Déconnexion">
                <LogOut className="h-[18px] w-[18px]" />
              </button>
            </form>
          </header>

          {(daysLeft !== null || !usable) && (
            <div
              className={
                usable
                  ? "flex flex-wrap items-center justify-center gap-x-3 gap-y-1 bg-accent/10 px-4 py-3 text-center text-[14px] text-foreground"
                  : "flex flex-wrap items-center justify-center gap-x-3 gap-y-1 bg-destructive px-4 py-3 text-center text-[14px] font-semibold text-destructive-foreground"
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

          <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-6 pb-24 sm:px-6 md:pb-10">{children}</main>
        </div>
        <DirectionMobileNav />
      </div>
    </BrandScope>
  );
}

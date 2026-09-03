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
        <aside className="hidden md:flex md:w-56 md:shrink-0 md:flex-col md:border-r md:border-border md:bg-card md:px-3 md:py-4">
          <div className="px-2 pb-4">
            <BrandMark tenant={tenant} href="/direction" />
          </div>
          <div className="flex-1">
            <DirectionSidebarNav />
          </div>
          <div className="mt-4 border-t border-border pt-3">
            <p className="truncate px-2 text-[12px] font-medium text-foreground">{user.name}</p>
            <p className="truncate px-2 font-mono text-[11px] text-muted-foreground">{user.email}</p>
            <form action={logoutAction} className="mt-2">
              <button
                type="submit"
                className="flex h-8 w-full items-center gap-2 rounded-md px-2 text-[12px] text-muted-foreground hover:bg-muted hover:text-foreground"
              >
                <LogOut className="h-3.5 w-3.5" /> Logout
              </button>
            </form>
          </div>
        </aside>

        <div className="flex min-w-0 flex-1 flex-col">
          <header className="flex h-12 items-center justify-between border-b border-border bg-card px-4 md:hidden">
            <BrandMark tenant={tenant} href="/direction" />
            <form action={logoutAction}>
              <button type="submit" className="flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground hover:bg-muted" aria-label="Déconnexion">
                <LogOut className="h-4 w-4" />
              </button>
            </form>
          </header>

          {(daysLeft !== null || !usable) && (
            <div
              className={
                usable
                  ? "flex flex-wrap items-center justify-center gap-x-3 gap-y-1 border-b border-border bg-muted/60 px-4 py-2 text-center text-[12px] text-foreground"
                  : "flex flex-wrap items-center justify-center gap-x-3 gap-y-1 border-b border-destructive/30 bg-destructive/10 px-4 py-2 text-center text-[12px] font-medium text-destructive"
              }
            >
              {usable ? (
                <>
                  Trial · <strong className="font-mono">{daysLeft}d</strong> remaining
                  <Link href="/direction/abonnement" className="font-medium text-accent underline-offset-2 hover:underline">
                    Choose plan
                  </Link>
                </>
              ) : (
                <>
                  Subscription inactive — tablets locked.
                  <Link href="/direction/abonnement" className="underline underline-offset-2">
                    Reactivate
                  </Link>
                </>
              )}
            </div>
          )}

          <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-5 pb-20 sm:px-6 md:pb-8">{children}</main>
        </div>
        <DirectionMobileNav />
      </div>
    </BrandScope>
  );
}

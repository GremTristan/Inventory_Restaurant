import Link from "next/link";
import { ArrowLeft, LogOut } from "lucide-react";
import { BrandMark, BrandScope } from "@/components/brand";
import { StaffNav } from "@/components/staff/staff-nav";
import { logoutAction } from "@/lib/auth/actions";
import { getLowStockItems } from "@/lib/inventory-store";
import { getActiveOrders } from "@/lib/order-store";
import { pageSite } from "@/lib/page-guards";
import { staffTabs } from "@/lib/staff-tabs";
import { ROLE_LABELS } from "@/types";

export default async function SiteLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ siteId: string }>;
}) {
  const { siteId } = await params;
  const { user, tenant, site } = await pageSite(siteId);

  const [lowStock, active] = await Promise.all([
    user.role === "waiter" ? Promise.resolve([]) : getLowStockItems(site.id),
    user.role === "cook" ? Promise.resolve([]) : getActiveOrders(site.id),
  ]);
  const tabs = staffTabs(site.id, user.role, {
    lowStock: lowStock.length,
    toPay: active.filter((o) => o.status === "served" || o.status === "ready").length,
  });

  return (
    <BrandScope tenant={tenant}>
      <div className="flex min-h-screen flex-col bg-background">
        <header className="no-print sticky top-0 z-30 flex items-center gap-3 border-b border-border/80 bg-card/90 px-4 py-3 backdrop-blur-xl sm:px-6">
          {user.role === "director" && (
            <Link
              href="/direction"
              className="flex h-10 w-10 items-center justify-center rounded-pill text-muted-foreground hover:bg-muted"
              aria-label="Retour à la direction"
            >
              <ArrowLeft className="h-[18px] w-[18px]" />
            </Link>
          )}
          <BrandMark tenant={tenant} href={tabs[0]?.href ?? "/connexion"} className="min-w-0" />
          <span className="hidden rounded-pill bg-muted px-3 py-1 text-[13px] font-semibold text-foreground sm:inline">
            {site.name}
          </span>
          <div className="hidden flex-1 justify-center lg:flex">
            <StaffNav tabs={tabs} />
          </div>
          <div className="ml-auto flex items-center gap-2">
            <span className="hidden text-right sm:block">
              <span className="block text-[14px] font-semibold leading-tight tracking-tight text-foreground">{user.name}</span>
              <span className="block text-[12px] leading-tight text-muted-foreground">{ROLE_LABELS[user.role]}</span>
            </span>
            <form action={logoutAction}>
              <button
                type="submit"
                className="flex h-10 items-center gap-2 rounded-pill px-3 text-[13px] font-medium text-muted-foreground hover:bg-muted hover:text-foreground"
                aria-label="Se déconnecter"
              >
                <LogOut className="h-[18px] w-[18px]" />
                <span className="hidden sm:inline">Quitter</span>
              </button>
            </form>
          </div>
        </header>
        <main className="mx-auto w-full max-w-6xl flex-1 px-4 pb-24 pt-5 sm:px-6 lg:pb-10">{children}</main>
        <div className="lg:hidden">
          <StaffNav tabs={tabs} />
        </div>
      </div>
    </BrandScope>
  );
}

import { notFound, redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/session";
import { getSiteById } from "@/data/sites";
import {
  getAllInventoryItems,
  getInventoryBySite,
  getVisibleInventoryBySiteForRole,
  getSuppliers,
} from "@/lib/inventory-store";
import { getInventoryAccessBySite, getPendingRemindersForRole, hasInventoryAccess } from "@/lib/sales-store";
import { siteHealth, totalStockValue } from "@/lib/inventory";
import { InventoryView } from "@/components/inventory-view";
import { RemindersBanner } from "@/components/reminders-banner";
import { WaiterHome } from "@/components/waiter-home";
import { ManagerHome } from "@/components/manager-home";
import { SiteSelector } from "@/components/site-selector";
import type { SiteId } from "@/types";

export default async function InventoryPage({
  params,
}: {
  params: Promise<{ siteId: string }>;
}) {
  const { siteId } = await params;
  const site = getSiteById(siteId);
  if (!site) notFound();

  const user = await getCurrentUser();
  if (!user) redirect("/login");

  // Managers and waiters are locked to their own site; directors can view
  // any site.
  if (user.role !== "director" && user.siteId !== site.id) {
    redirect(`/inventory/${user.siteId}`);
  }

  const isDirector = user.role === "director";
  const isWaiter = user.role === "waiter";
  const isManager = user.role === "manager";
  const pendingForRole = getPendingRemindersForRole(site.id as SiteId, user.role);
  const managerAccessGranted = isManager && hasInventoryAccess(site.id as SiteId);

  if (isWaiter) {
    return (
      <>
        <RemindersBanner siteId={site.id as SiteId} pending={pendingForRole} />
        <div>
          <h1 className="text-2xl font-bold text-foreground sm:text-3xl">{site.name}</h1>
          <p className="mt-1 text-sm text-muted-foreground">Que voulez-vous faire aujourd&apos;hui ?</p>
        </div>
        <div className="mt-6">
          <WaiterHome siteId={site.id as SiteId} salesPending={pendingForRole.length > 0} />
        </div>
      </>
    );
  }

  if (isManager && !managerAccessGranted) {
    return (
      <>
        <RemindersBanner siteId={site.id as SiteId} pending={pendingForRole} />
        <div>
          <h1 className="text-2xl font-bold text-foreground sm:text-3xl">{site.name}</h1>
          <p className="mt-1 text-sm text-muted-foreground">Que voulez-vous faire aujourd&apos;hui ?</p>
        </div>
        <div className="mt-6">
          <ManagerHome siteId={site.id as SiteId} accessGranted={false} />
        </div>
      </>
    );
  }

  const items = isDirector
    ? getInventoryBySite(site.id as SiteId)
    : getVisibleInventoryBySiteForRole(site.id as SiteId, user.role);
  const suppliers = getSuppliers();

  let siteSelector: React.ReactNode = null;
  if (isDirector) {
    const allItems = getAllInventoryItems();
    siteSelector = (
      <div className="mb-6">
        <SiteSelector
          sitesHealth={siteHealth(allItems)}
          grandTotal={totalStockValue(allItems)}
          inventoryAccessBySite={getInventoryAccessBySite()}
          currentSiteId={site.id as SiteId}
          navigateSuffix=""
        />
      </div>
    );
  }

  return (
    <>
      {siteSelector}
      <RemindersBanner siteId={site.id as SiteId} pending={pendingForRole} />
      <div>
        <h1 className="text-2xl font-bold text-foreground sm:text-3xl">Inventaire — {site.name}</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {isDirector
            ? "Modifiez les quantités et les prix unitaires ; la valeur du stock se recalcule automatiquement."
            : "Comptez votre stock : touchez un article pour ajuster la quantité."}
        </p>
      </div>
      <div className="mt-6">
        <InventoryView items={items} siteId={site.id as SiteId} isDirector={isDirector} suppliers={suppliers} />
      </div>
    </>
  );
}

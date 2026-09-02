import { handle } from "@/lib/api";
import { getAuditLogForTenant } from "@/lib/audit";
import { addDays, todayPeriod } from "@/lib/dates";
import { getInventoryForTenant, getSuppliers } from "@/lib/inventory-store";
import { getMenuForTenant } from "@/lib/menu-store";
import { getPaidOrdersForTenant } from "@/lib/order-store";
import { getDailySalesForTenant } from "@/lib/sales-store";
import { requireDirector } from "@/lib/session";
import { getSitesForTenant } from "@/lib/site-store";
import { getUsersForTenant } from "@/lib/user-store";

// GDPR portability: everything the tenant owns, in one JSON file. Credential
// hashes are never included (getUsersForTenant strips them).
export async function GET() {
  return handle(async () => {
    const { tenant } = await requireDirector({ allowInactiveTenant: true });
    const today = todayPeriod();
    const [sites, users, menu, inventory, suppliers, orders, closures, auditLog] = await Promise.all([
      getSitesForTenant(tenant.id),
      getUsersForTenant(tenant.id),
      getMenuForTenant(tenant.id),
      getInventoryForTenant(tenant.id),
      getSuppliers(tenant.id),
      getPaidOrdersForTenant(tenant.id, addDays(today, -730), today),
      getDailySalesForTenant(tenant.id, addDays(today, -730), today),
      getAuditLogForTenant(tenant.id, 5000),
    ]);
    const body = JSON.stringify(
      { exportedAt: new Date().toISOString(), tenant, sites, users, menu, inventory, suppliers, orders, closures, auditLog },
      null,
      2
    );
    return new Response(body, {
      headers: {
        "content-type": "application/json; charset=utf-8",
        "content-disposition": `attachment; filename="${tenant.slug}-donnees-${today}.json"`,
      },
    });
  });
}

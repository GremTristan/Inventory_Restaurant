import { recommendRestockQty, estimateDaysLeft, detectStockActions, buildDirectorSituation } from "@/lib/intelligence/build-feed";
import type { InventoryItem, Site, Tenant, User } from "@/types";

function assert(cond: unknown, msg: string) {
  if (!cond) throw new Error(msg);
}

const item = (partial: Partial<InventoryItem> & Pick<InventoryItem, "id" | "name" | "quantity" | "lowStockThreshold">): InventoryItem => ({
  tenantId: "t1",
  siteId: "s1",
  zone: "cuisine",
  unit: "kg",
  unitsPerPackage: 1,
  unitPrice: 10,
  supplierId: null,
  visibleToManager: true,
  visibleToServer: false,
  category: "sec",
  ...partial,
});

assert(recommendRestockQty(item({ id: "1", name: "Beurre", quantity: 4.2, lowStockThreshold: 5 })) >= 5, "restock suggests enough to clear threshold");
assert(estimateDaysLeft(item({ id: "1", name: "Beurre", quantity: 4.2, lowStockThreshold: 5 })) !== null, "days estimate present");

const sites: Site[] = [{ id: "s1", tenantId: "t1", name: "Genève", slug: "g", deviceCode: "ABC123", active: true }];
const actions = detectStockActions({
  items: [item({ id: "1", name: "Beurre", quantity: 0, lowStockThreshold: 5 })],
  sites,
});
assert(actions.length === 1 && actions[0].severity === "critical", "zero stock is critical");
assert(actions[0].actionHref.includes("focus=low"), "deep link to exceptions");

const tenant: Tenant = {
  id: "t1",
  name: "Demo",
  slug: "demo",
  brandColor: null,
  logoUrl: null,
  currency: "CHF",
  status: "active",
  plan: "pro",
  trialEndsAt: null,
  stripeCustomerId: null,
  stripeSubscriptionId: null,
  billingEmail: null,
  legalName: null,
  legalAddress: null,
  createdAt: new Date().toISOString(),
};
const staff: User[] = [{ id: "u1", tenantId: "t1", name: "A", role: "waiter", siteId: "s1", email: null, active: true }];
const calm = buildDirectorSituation({
  tenant,
  sites,
  inventory: [item({ id: "1", name: "Farine", quantity: 50, lowStockThreshold: 5 })],
  menuCount: 3,
  staff,
  hasOrders: true,
  activeBySite: [[]],
  inventoryPendingBySite: [false],
});
assert(calm.actions.length === 0, "normal state is silent");

console.log("intelligence harness OK");

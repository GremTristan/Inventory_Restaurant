import type { Role } from "@/types";

export type StaffTabKey = "service" | "commande" | "caisse" | "cuisine" | "stock";

export interface StaffTab {
  key: StaffTabKey;
  href: string;
  label: string;
  badge?: number;
}

export function staffTabs(siteId: string, role: Role, counts: { lowStock?: number; toPay?: number } = {}): StaffTab[] {
  const waiter: StaffTab[] = [
    { key: "service", href: `/s/${siteId}/service`, label: "Commandes" },
    { key: "commande", href: `/s/${siteId}/commande`, label: "Nouvelle" },
    { key: "caisse", href: `/s/${siteId}/caisse`, label: "Caisse", badge: counts.toPay },
  ];
  const cook: StaffTab[] = [
    { key: "cuisine", href: `/s/${siteId}/cuisine`, label: "Cuisine" },
    { key: "stock", href: `/s/${siteId}/stock`, label: "Stock", badge: counts.lowStock },
  ];
  if (role === "waiter") return waiter;
  if (role === "cook") return cook;
  return [...waiter, ...cook];
}

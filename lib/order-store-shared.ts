import type { Order, PaymentMethod } from "@/types";

// Pure aggregation shared by the till (client) and reports (server).
export interface DayTotals {
  count: number;
  total: number;
  byMethod: Record<PaymentMethod, number>;
  quantitiesByMenuItemId: Record<string, number>;
}

export function summarizePaid(orders: Order[]): DayTotals {
  const totals: DayTotals = {
    count: 0,
    total: 0,
    byMethod: { cash: 0, card: 0, twint: 0, other: 0 },
    quantitiesByMenuItemId: {},
  };
  for (const order of orders) {
    if (order.status !== "paid") continue;
    totals.count += 1;
    totals.total += order.total;
    if (order.paymentMethod) totals.byMethod[order.paymentMethod] += order.total;
    for (const item of order.items) {
      if (!item.menuItemId) continue;
      totals.quantitiesByMenuItemId[item.menuItemId] =
        (totals.quantitiesByMenuItemId[item.menuItemId] ?? 0) + item.quantity;
    }
  }
  return totals;
}

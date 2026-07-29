import type { DailySalesEntry } from "@/types";

export interface DailyRevenuePoint {
  date: string;
  netRevenue: number;
}

// Sums netRevenue across all sites' entries for the same date. Input is the
// concatenation of getDailySalesBySite(site.id) for every site; callers
// fetch per-site (the store is keyed that way) and pass the flattened array
// in here.
export function aggregateRevenueByDate(allEntries: DailySalesEntry[]): DailyRevenuePoint[] {
  const byDate = new Map<string, number>();
  for (const entry of allEntries) {
    byDate.set(entry.date, (byDate.get(entry.date) ?? 0) + entry.netRevenue);
  }
  return Array.from(byDate.entries())
    .map(([date, netRevenue]) => ({ date, netRevenue }))
    .sort((a, b) => a.date.localeCompare(b.date));
}

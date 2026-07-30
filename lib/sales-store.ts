import "server-only";

import { and, eq } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { dailySalesEntries, inventoryAccessGrants, menuItems, reminderCompletions } from "@/lib/db/schema";
import type { DailySalesEntry, MenuItem, ReminderKind, Role, SiteId } from "@/types";
import { sites } from "@/data/sites";

// Postgres-backed store for menu, daily sales and reminder completions —
// migrated off data/sales-config.json (see scripts/migrate-json-to-postgres.ts).

type DailySalesRow = typeof dailySalesEntries.$inferSelect;

function toDailySalesEntry(row: DailySalesRow): DailySalesEntry {
  return {
    id: row.id,
    siteId: row.siteId,
    date: row.date,
    cardRevenue: Number(row.cardRevenue),
    netRevenue: Number(row.netRevenue),
    quantities: row.quantities,
    recordedByUserId: row.recordedByUserId,
    recordedAt: row.recordedAt.toISOString(),
  };
}

export function todayPeriod(): string {
  return new Date().toISOString().slice(0, 10);
}

export function monthPeriod(): string {
  return new Date().toISOString().slice(0, 7);
}

// --- Menu ---

export async function getMenuItems(siteId: SiteId): Promise<MenuItem[]> {
  return db.select().from(menuItems).where(eq(menuItems.siteId, siteId));
}

export async function addMenuItem(siteId: SiteId, name: string): Promise<MenuItem> {
  const [item] = await db.insert(menuItems).values({ siteId, name }).returning();
  return item;
}

export async function renameMenuItem(id: string, name: string): Promise<void> {
  await db.update(menuItems).set({ name }).where(eq(menuItems.id, id));
}

export async function deleteMenuItem(id: string): Promise<void> {
  await db.delete(menuItems).where(eq(menuItems.id, id));
}

// --- Daily sales ---

export async function getDailySalesBySite(siteId: SiteId): Promise<DailySalesEntry[]> {
  const rows = await db.select().from(dailySalesEntries).where(eq(dailySalesEntries.siteId, siteId));
  return rows.map(toDailySalesEntry).sort((a, b) => b.date.localeCompare(a.date));
}

export async function getDailySalesEntry(
  siteId: SiteId,
  date: string
): Promise<DailySalesEntry | undefined> {
  const [row] = await db
    .select()
    .from(dailySalesEntries)
    .where(and(eq(dailySalesEntries.siteId, siteId), eq(dailySalesEntries.date, date)));
  return row ? toDailySalesEntry(row) : undefined;
}

export async function recordDailySales(input: {
  siteId: SiteId;
  date: string;
  cardRevenue: number;
  netRevenue: number;
  quantities: Record<string, number>;
  recordedByUserId: string;
}): Promise<DailySalesEntry> {
  const [row] = await db
    .insert(dailySalesEntries)
    .values({
      siteId: input.siteId,
      date: input.date,
      cardRevenue: input.cardRevenue.toString(),
      netRevenue: input.netRevenue.toString(),
      quantities: input.quantities,
      recordedByUserId: input.recordedByUserId,
      recordedAt: new Date(),
    })
    .onConflictDoUpdate({
      target: [dailySalesEntries.siteId, dailySalesEntries.date],
      set: {
        cardRevenue: input.cardRevenue.toString(),
        netRevenue: input.netRevenue.toString(),
        quantities: input.quantities,
        recordedByUserId: input.recordedByUserId,
        recordedAt: new Date(),
      },
    })
    .returning();
  return toDailySalesEntry(row);
}

// --- Reminders ---

export async function isReminderComplete(
  siteId: SiteId,
  kind: ReminderKind,
  period: string
): Promise<boolean> {
  const [row] = await db
    .select()
    .from(reminderCompletions)
    .where(
      and(
        eq(reminderCompletions.siteId, siteId),
        eq(reminderCompletions.kind, kind),
        eq(reminderCompletions.period, period)
      )
    );
  return row !== undefined;
}

export async function markReminderComplete(
  siteId: SiteId,
  kind: ReminderKind,
  period: string,
  completedByUserId: string
): Promise<void> {
  await db
    .insert(reminderCompletions)
    .values({ siteId, kind, period, completedByUserId, completedAt: new Date() })
    .onConflictDoUpdate({
      target: [reminderCompletions.siteId, reminderCompletions.kind, reminderCompletions.period],
      set: { completedByUserId, completedAt: new Date() },
    });
}

export interface PendingReminder {
  kind: ReminderKind;
  period: string;
}

// Single source of truth for "what's pending" — both the nav badge and the
// notifications banner call this, so they can never drift out of sync.
export async function getPendingReminders(siteId: SiteId): Promise<PendingReminder[]> {
  const today = todayPeriod();
  const month = monthPeriod();
  const pending: PendingReminder[] = [];

  const [dailyDone, monthlyDone] = await Promise.all([
    isReminderComplete(siteId, "daily-sales", today),
    isReminderComplete(siteId, "monthly-inventory", month),
  ]);

  if (!dailyDone) pending.push({ kind: "daily-sales", period: today });
  if (!monthlyDone) pending.push({ kind: "monthly-inventory", period: month });
  return pending;
}

export async function getPendingReminderCounts(): Promise<Partial<Record<SiteId, number>>> {
  const entries = await Promise.all(
    sites.map(async (site) => [site.id, (await getPendingReminders(site.id)).length] as const)
  );
  return Object.fromEntries(entries);
}

// Which reminder kind each role is actually responsible for — a manager
// (chef crêpier) doesn't own the till, a waiter doesn't own the monthly
// stock count. Directors see everything (kept as-is for the group nav
// badge). Used to scope the login-screen dot and the per-user pending check
// to only the task that person would actually act on.
const REMINDER_KIND_BY_ROLE: Partial<Record<Role, ReminderKind>> = {
  manager: "monthly-inventory",
  waiter: "daily-sales",
};

export async function getPendingRemindersForRole(siteId: SiteId, role: Role): Promise<PendingReminder[]> {
  const kind = REMINDER_KIND_BY_ROLE[role];
  const pending = await getPendingReminders(siteId);
  return kind ? pending.filter((reminder) => reminder.kind === kind) : pending;
}

export async function hasPendingReminderForRole(siteId: SiteId, role: Role): Promise<boolean> {
  return (await getPendingRemindersForRole(siteId, role)).length > 0;
}

// --- Manager inventory access ---

export async function hasInventoryAccess(siteId: SiteId): Promise<boolean> {
  const [row] = await db
    .select()
    .from(inventoryAccessGrants)
    .where(eq(inventoryAccessGrants.siteId, siteId));
  return row !== undefined;
}

export async function setInventoryAccess(siteId: SiteId, granted: boolean): Promise<void> {
  if (granted) {
    await db.insert(inventoryAccessGrants).values({ siteId }).onConflictDoNothing();
  } else {
    await db.delete(inventoryAccessGrants).where(eq(inventoryAccessGrants.siteId, siteId));
  }
}

export async function getInventoryAccessBySite(): Promise<Record<SiteId, boolean>> {
  const rows = await db.select().from(inventoryAccessGrants);
  const granted = new Set(rows.map((r) => r.siteId));
  return Object.fromEntries(sites.map((site) => [site.id, granted.has(site.id)])) as Record<
    SiteId,
    boolean
  >;
}

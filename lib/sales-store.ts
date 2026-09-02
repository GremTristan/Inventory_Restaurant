import "server-only";

import { and, desc, eq, gte, inArray, lte } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { dailySalesEntries, reminderCompletions } from "@/lib/db/schema";
import { monthPeriod, todayPeriod } from "@/lib/dates";
import type { DailySalesEntry, ReminderKind, Role, SiteId } from "@/types";

export { todayPeriod, monthPeriod };

type DailySalesRow = typeof dailySalesEntries.$inferSelect;

function toDailySalesEntry(row: DailySalesRow): DailySalesEntry {
  return {
    id: row.id,
    tenantId: row.tenantId,
    siteId: row.siteId,
    date: row.date,
    cardRevenue: Number(row.cardRevenue),
    twintRevenue: Number(row.twintRevenue),
    netRevenue: Number(row.netRevenue),
    quantities: row.quantities,
    recordedByUserId: row.recordedByUserId,
    recordedAt: row.recordedAt.toISOString(),
  };
}

// --- Daily closures ---

export async function getDailySalesBySite(siteId: SiteId, limit = 90): Promise<DailySalesEntry[]> {
  const rows = await db
    .select()
    .from(dailySalesEntries)
    .where(eq(dailySalesEntries.siteId, siteId))
    .orderBy(desc(dailySalesEntries.date))
    .limit(limit);
  return rows.map(toDailySalesEntry);
}

export async function getDailySalesForTenant(tenantId: string, fromDay: string, toDay: string): Promise<DailySalesEntry[]> {
  const rows = await db
    .select()
    .from(dailySalesEntries)
    .where(
      and(eq(dailySalesEntries.tenantId, tenantId), gte(dailySalesEntries.date, fromDay), lte(dailySalesEntries.date, toDay))
    )
    .orderBy(desc(dailySalesEntries.date));
  return rows.map(toDailySalesEntry);
}

export async function getDailySalesEntry(siteId: SiteId, date: string): Promise<DailySalesEntry | undefined> {
  const [row] = await db
    .select()
    .from(dailySalesEntries)
    .where(and(eq(dailySalesEntries.siteId, siteId), eq(dailySalesEntries.date, date)));
  return row ? toDailySalesEntry(row) : undefined;
}

export async function recordDailySales(input: {
  tenantId: string;
  siteId: SiteId;
  date: string;
  cardRevenue: number;
  twintRevenue?: number;
  netRevenue: number;
  quantities: Record<string, number>;
  recordedByUserId: string;
}): Promise<DailySalesEntry> {
  const values = {
    cardRevenue: input.cardRevenue.toFixed(2),
    twintRevenue: (input.twintRevenue ?? 0).toFixed(2),
    netRevenue: input.netRevenue.toFixed(2),
    quantities: input.quantities,
    recordedByUserId: input.recordedByUserId,
    recordedAt: new Date(),
  };
  const [row] = await db
    .insert(dailySalesEntries)
    .values({ tenantId: input.tenantId, siteId: input.siteId, date: input.date, ...values })
    .onConflictDoUpdate({ target: [dailySalesEntries.siteId, dailySalesEntries.date], set: values })
    .returning();
  return toDailySalesEntry(row);
}

// --- Reminders ---

export async function isReminderComplete(siteId: SiteId, kind: ReminderKind, period: string): Promise<boolean> {
  const [row] = await db
    .select({ id: reminderCompletions.id })
    .from(reminderCompletions)
    .where(
      and(eq(reminderCompletions.siteId, siteId), eq(reminderCompletions.kind, kind), eq(reminderCompletions.period, period))
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

export async function getPendingReminders(siteId: SiteId): Promise<PendingReminder[]> {
  const today = todayPeriod();
  const month = monthPeriod();
  const rows = await db
    .select({ kind: reminderCompletions.kind, period: reminderCompletions.period })
    .from(reminderCompletions)
    .where(and(eq(reminderCompletions.siteId, siteId), inArray(reminderCompletions.period, [today, month])));
  const done = new Set(rows.map((r) => `${r.kind}:${r.period}`));
  const pending: PendingReminder[] = [];
  if (!done.has(`daily-sales:${today}`)) pending.push({ kind: "daily-sales", period: today });
  if (!done.has(`monthly-inventory:${month}`)) pending.push({ kind: "monthly-inventory", period: month });
  return pending;
}

// Which reminder each role owns: the waiter closes the till, the cook counts
// the stock. Directors see everything.
const REMINDER_KIND_BY_ROLE: Partial<Record<Role, ReminderKind>> = {
  cook: "monthly-inventory",
  waiter: "daily-sales",
};

export async function getPendingRemindersForRole(siteId: SiteId, role: Role): Promise<PendingReminder[]> {
  const kind = REMINDER_KIND_BY_ROLE[role];
  const pending = await getPendingReminders(siteId);
  return kind ? pending.filter((reminder) => reminder.kind === kind) : pending;
}

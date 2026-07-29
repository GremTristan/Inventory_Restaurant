import "server-only";

import fs from "fs";
import path from "path";
import { randomUUID } from "crypto";
import type {
  DailySalesEntry,
  MenuItem,
  ReminderCompletion,
  ReminderKind,
  Role,
  SiteId,
} from "@/types";
import { initialMenu } from "@/data/menu";
import { sites } from "@/data/sites";

// File-backed store for menu, daily sales and reminder completions. Kept
// separate from inventory-store.ts's site-config.json so that unrelated
// writes (e.g. marking a reminder done) never touch stock data, and so the
// already-persisted site-config.json needs no backfilling for this feature.
const DATA_FILE = path.join(process.cwd(), "data", "sales-config.json");

interface StoreData {
  menu: MenuItem[];
  dailySales: DailySalesEntry[];
  reminderCompletions: ReminderCompletion[];
  // Sites where the director has granted the chef crêpier direct access to
  // the inventory screen. Off by default — a manager's home screen shows a
  // muted, unclickable-in-effect "Inventaire" card until the director flips
  // this on for their site.
  inventoryAccessSites: SiteId[];
}

function seed(): StoreData {
  return { menu: initialMenu, dailySales: [], reminderCompletions: [], inventoryAccessSites: [] };
}

const initialMenuItemById = new Map(initialMenu.map((item) => [item.id, item]));

// Backfill seams for fields added after records may already exist on disk —
// same discipline as inventory-store.ts's normalizeItem, wired in now so the
// next field addition doesn't require remembering to add it later. Menu
// items written before menus were per-site have no `siteId` — recover it
// from the seed by id, falling back to the first site as a last resort
// (shouldn't normally happen).
function normalizeMenuItem(item: MenuItem): MenuItem {
  return {
    ...item,
    siteId: item.siteId ?? initialMenuItemById.get(item.id)?.siteId ?? sites[0].id,
  };
}

// Records written before CB/CA net split had a single `revenue` field —
// treat it as the net revenue with no card breakdown known.
function normalizeDailySalesEntry(entry: DailySalesEntry): DailySalesEntry {
  const legacyRevenue = (entry as unknown as { revenue?: number }).revenue;
  return {
    ...entry,
    cardRevenue: entry.cardRevenue ?? 0,
    netRevenue: entry.netRevenue ?? legacyRevenue ?? 0,
    quantities: entry.quantities ?? {},
  };
}

function normalizeReminderCompletion(record: ReminderCompletion): ReminderCompletion {
  return { ...record };
}

function readStore(): StoreData {
  if (!fs.existsSync(DATA_FILE)) {
    const data = seed();
    writeStore(data);
    return data;
  }
  const raw = fs.readFileSync(DATA_FILE, "utf-8");
  const data = JSON.parse(raw) as StoreData;
  data.menu = data.menu.map(normalizeMenuItem);
  data.dailySales = data.dailySales.map(normalizeDailySalesEntry);
  data.reminderCompletions = data.reminderCompletions.map(normalizeReminderCompletion);
  // Records written before this feature existed have no field at all —
  // default to no access granted, matching seed().
  data.inventoryAccessSites = data.inventoryAccessSites ?? [];
  return data;
}

function writeStore(data: StoreData) {
  const tmpFile = `${DATA_FILE}.${process.pid}.tmp`;
  fs.writeFileSync(tmpFile, JSON.stringify(data, null, 2), "utf-8");
  fs.renameSync(tmpFile, DATA_FILE);
}

export function todayPeriod(): string {
  return new Date().toISOString().slice(0, 10);
}

export function monthPeriod(): string {
  return new Date().toISOString().slice(0, 7);
}

// --- Menu ---

export function getMenuItems(siteId: SiteId): MenuItem[] {
  return readStore().menu.filter((item) => item.siteId === siteId);
}

export function addMenuItem(siteId: SiteId, name: string): MenuItem {
  const data = readStore();
  const item: MenuItem = { id: randomUUID(), siteId, name };
  data.menu.push(item);
  writeStore(data);
  return item;
}

export function renameMenuItem(id: string, name: string) {
  const data = readStore();
  const item = data.menu.find((i) => i.id === id);
  if (!item) return;
  item.name = name;
  writeStore(data);
}

export function deleteMenuItem(id: string) {
  const data = readStore();
  data.menu = data.menu.filter((i) => i.id !== id);
  writeStore(data);
}

// --- Daily sales ---

export function getDailySalesBySite(siteId: SiteId): DailySalesEntry[] {
  return readStore()
    .dailySales.filter((entry) => entry.siteId === siteId)
    .sort((a, b) => b.date.localeCompare(a.date));
}

export function getDailySalesEntry(siteId: SiteId, date: string): DailySalesEntry | undefined {
  return readStore().dailySales.find((entry) => entry.siteId === siteId && entry.date === date);
}

export function recordDailySales(input: {
  siteId: SiteId;
  date: string;
  cardRevenue: number;
  netRevenue: number;
  quantities: Record<string, number>;
  recordedByUserId: string;
}): DailySalesEntry {
  const data = readStore();
  const existing = data.dailySales.find(
    (entry) => entry.siteId === input.siteId && entry.date === input.date
  );
  const recordedAt = new Date().toISOString();

  if (existing) {
    existing.cardRevenue = input.cardRevenue;
    existing.netRevenue = input.netRevenue;
    existing.quantities = input.quantities;
    existing.recordedByUserId = input.recordedByUserId;
    existing.recordedAt = recordedAt;
    writeStore(data);
    return existing;
  }

  const entry: DailySalesEntry = {
    id: randomUUID(),
    siteId: input.siteId,
    date: input.date,
    cardRevenue: input.cardRevenue,
    netRevenue: input.netRevenue,
    quantities: input.quantities,
    recordedByUserId: input.recordedByUserId,
    recordedAt,
  };
  data.dailySales.push(entry);
  writeStore(data);
  return entry;
}

// --- Reminders ---

export function isReminderComplete(siteId: SiteId, kind: ReminderKind, period: string): boolean {
  return readStore().reminderCompletions.some(
    (record) => record.siteId === siteId && record.kind === kind && record.period === period
  );
}

export function markReminderComplete(
  siteId: SiteId,
  kind: ReminderKind,
  period: string,
  completedByUserId: string
) {
  const data = readStore();
  const existing = data.reminderCompletions.find(
    (record) => record.siteId === siteId && record.kind === kind && record.period === period
  );
  const completedAt = new Date().toISOString();

  if (existing) {
    existing.completedAt = completedAt;
    existing.completedByUserId = completedByUserId;
  } else {
    data.reminderCompletions.push({
      id: randomUUID(),
      siteId,
      kind,
      period,
      completedAt,
      completedByUserId,
    });
  }
  writeStore(data);
}

export interface PendingReminder {
  kind: ReminderKind;
  period: string;
}

// Single source of truth for "what's pending" — both the nav badge and the
// notifications banner call this, so they can never drift out of sync.
export function getPendingReminders(siteId: SiteId): PendingReminder[] {
  const today = todayPeriod();
  const month = monthPeriod();
  const pending: PendingReminder[] = [];

  if (!isReminderComplete(siteId, "daily-sales", today)) {
    pending.push({ kind: "daily-sales", period: today });
  }
  if (!isReminderComplete(siteId, "monthly-inventory", month)) {
    pending.push({ kind: "monthly-inventory", period: month });
  }
  return pending;
}

export function getPendingReminderCounts(): Partial<Record<SiteId, number>> {
  return Object.fromEntries(sites.map((site) => [site.id, getPendingReminders(site.id).length]));
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

export function getPendingRemindersForRole(siteId: SiteId, role: Role): PendingReminder[] {
  const kind = REMINDER_KIND_BY_ROLE[role];
  const pending = getPendingReminders(siteId);
  return kind ? pending.filter((reminder) => reminder.kind === kind) : pending;
}

export function hasPendingReminderForRole(siteId: SiteId, role: Role): boolean {
  return getPendingRemindersForRole(siteId, role).length > 0;
}

// --- Manager inventory access ---

export function hasInventoryAccess(siteId: SiteId): boolean {
  return readStore().inventoryAccessSites.includes(siteId);
}

export function setInventoryAccess(siteId: SiteId, granted: boolean) {
  const data = readStore();
  const has = data.inventoryAccessSites.includes(siteId);
  if (granted && !has) {
    data.inventoryAccessSites.push(siteId);
    writeStore(data);
  } else if (!granted && has) {
    data.inventoryAccessSites = data.inventoryAccessSites.filter((id) => id !== siteId);
    writeStore(data);
  }
}

export function getInventoryAccessBySite(): Record<SiteId, boolean> {
  const granted = new Set(readStore().inventoryAccessSites);
  return Object.fromEntries(sites.map((site) => [site.id, granted.has(site.id)])) as Record<
    SiteId,
    boolean
  >;
}

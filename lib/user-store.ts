import "server-only";

import { and, eq, inArray } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { users } from "@/lib/db/schema";
import type { AuthUser, Role, User } from "@/types";

type UserRow = typeof users.$inferSelect;

function toAuthUser(row: UserRow): AuthUser {
  return {
    id: row.id,
    tenantId: row.tenantId,
    name: row.name,
    role: row.role,
    siteId: row.siteId,
    email: row.email,
    active: row.active,
    passwordHash: row.passwordHash,
    pinHash: row.pinHash,
    failedAttempts: row.failedAttempts,
    lockedUntil: row.lockedUntil ? row.lockedUntil.toISOString() : null,
  };
}

function stripSecrets(authUser: AuthUser): User {
  return {
    id: authUser.id,
    tenantId: authUser.tenantId,
    name: authUser.name,
    role: authUser.role,
    siteId: authUser.siteId,
    email: authUser.email,
    active: authUser.active,
  };
}

// --- Public reads (never expose hashes) ---

export async function getUserById(id: string): Promise<User | undefined> {
  if (!/^[0-9a-f-]{36}$/i.test(id)) return undefined;
  const [row] = await db.select().from(users).where(eq(users.id, id));
  return row ? stripSecrets(toAuthUser(row)) : undefined;
}

export async function getUsersForTenant(tenantId: string): Promise<User[]> {
  const rows = await db.select().from(users).where(eq(users.tenantId, tenantId)).orderBy(users.name);
  return rows.map(toAuthUser).map(stripSecrets);
}

// Staff shown on a site-bound tablet's PIN screen.
export async function getActiveStaffForSite(siteId: string): Promise<User[]> {
  const rows = await db
    .select()
    .from(users)
    .where(and(eq(users.siteId, siteId), eq(users.active, true), inArray(users.role, ["cook", "waiter"])))
    .orderBy(users.name);
  return rows.map(toAuthUser).map(stripSecrets);
}

export async function getUsersBySite(siteId: string): Promise<User[]> {
  const rows = await db.select().from(users).where(eq(users.siteId, siteId)).orderBy(users.name);
  return rows.map(toAuthUser).map(stripSecrets);
}

// --- Internal-only: carries hashes, for credential verification ---

export async function getAuthUserById(id: string): Promise<AuthUser | undefined> {
  if (!/^[0-9a-f-]{36}$/i.test(id)) return undefined;
  const [row] = await db.select().from(users).where(eq(users.id, id));
  return row ? toAuthUser(row) : undefined;
}

export async function getAuthUserByEmail(email: string): Promise<AuthUser | undefined> {
  const [row] = await db.select().from(users).where(eq(users.email, email.trim().toLowerCase()));
  return row ? toAuthUser(row) : undefined;
}

export async function recordFailedAttempt(id: string, lockAfter: number, lockMinutes: number): Promise<void> {
  const user = await getAuthUserById(id);
  if (!user) return;
  const attempts = user.failedAttempts + 1;
  await db
    .update(users)
    .set({
      failedAttempts: attempts,
      lockedUntil: attempts >= lockAfter ? new Date(Date.now() + lockMinutes * 60 * 1000) : null,
    })
    .where(eq(users.id, id));
}

export async function resetFailedAttempts(id: string): Promise<void> {
  await db.update(users).set({ failedAttempts: 0, lockedUntil: null }).where(eq(users.id, id));
}

// --- Mutations (tenant-scoped; callers enforce the role check) ---

export async function createStaffUser(input: {
  tenantId: string;
  siteId: string;
  name: string;
  role: Exclude<Role, "director" | "superadmin">;
  pinHash: string;
}): Promise<User> {
  const [row] = await db
    .insert(users)
    .values({
      tenantId: input.tenantId,
      siteId: input.siteId,
      name: input.name,
      role: input.role,
      pinHash: input.pinHash,
    })
    .returning();
  return stripSecrets(toAuthUser(row));
}

export async function createDirectorUser(input: {
  tenantId: string;
  name: string;
  email: string;
  passwordHash: string;
}): Promise<User> {
  const [row] = await db
    .insert(users)
    .values({
      tenantId: input.tenantId,
      name: input.name,
      role: "director",
      email: input.email.trim().toLowerCase(),
      passwordHash: input.passwordHash,
    })
    .returning();
  return stripSecrets(toAuthUser(row));
}

export async function createSuperAdmin(input: { name: string; email: string; passwordHash: string }): Promise<User> {
  const [row] = await db
    .insert(users)
    .values({
      tenantId: null,
      name: input.name,
      role: "superadmin",
      email: input.email.trim().toLowerCase(),
      passwordHash: input.passwordHash,
    })
    .returning();
  return stripSecrets(toAuthUser(row));
}

export async function renameUser(tenantId: string, id: string, name: string): Promise<void> {
  await db
    .update(users)
    .set({ name })
    .where(and(eq(users.id, id), eq(users.tenantId, tenantId)));
}

export async function setUserActive(tenantId: string, id: string, active: boolean): Promise<void> {
  await db
    .update(users)
    .set({ active })
    .where(and(eq(users.id, id), eq(users.tenantId, tenantId)));
}

export async function moveUserToSite(tenantId: string, id: string, siteId: string): Promise<void> {
  await db
    .update(users)
    .set({ siteId })
    .where(and(eq(users.id, id), eq(users.tenantId, tenantId)));
}

export async function deleteStaffUser(tenantId: string, id: string): Promise<void> {
  // Directors can't delete themselves or other directors through the team
  // screen — that goes through account settings.
  await db
    .delete(users)
    .where(and(eq(users.id, id), eq(users.tenantId, tenantId), inArray(users.role, ["cook", "waiter"])));
}

export async function setUserPin(tenantId: string, id: string, pinHash: string): Promise<void> {
  await db
    .update(users)
    .set({ pinHash, failedAttempts: 0, lockedUntil: null })
    .where(and(eq(users.id, id), eq(users.tenantId, tenantId)));
}

export async function setUserPassword(id: string, passwordHash: string): Promise<void> {
  await db.update(users).set({ passwordHash, failedAttempts: 0, lockedUntil: null }).where(eq(users.id, id));
}

export async function setUserEmail(id: string, email: string): Promise<void> {
  await db.update(users).set({ email: email.trim().toLowerCase() }).where(eq(users.id, id));
}

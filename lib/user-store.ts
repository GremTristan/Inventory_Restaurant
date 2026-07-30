import "server-only";

import { eq } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { users } from "@/lib/db/schema";
import type { AuthUser, Role, SiteId, User } from "@/types";

// Postgres-backed store for user accounts (directory + hashed PINs) —
// migrated off data/user-config.json (see scripts/migrate-json-to-postgres.ts).

function stripHash(authUser: AuthUser): User {
  const { passwordHash: _passwordHash, ...publicUser } = authUser;
  return publicUser;
}

function toAuthUser(row: typeof users.$inferSelect): AuthUser {
  return {
    id: row.id,
    name: row.name,
    role: row.role,
    siteId: row.siteId,
    passwordHash: row.passwordHash,
  };
}

// --- Public reads (never expose passwordHash) ---

export async function getAllUsers(): Promise<User[]> {
  const rows = await db.select().from(users);
  return rows.map(toAuthUser).map(stripHash);
}

export async function getUserById(id: string): Promise<User | undefined> {
  const [row] = await db.select().from(users).where(eq(users.id, id));
  return row ? stripHash(toAuthUser(row)) : undefined;
}

export async function getUsersBySite(siteId: SiteId): Promise<User[]> {
  const rows = await db.select().from(users).where(eq(users.siteId, siteId));
  return rows.map(toAuthUser).map(stripHash);
}

// --- Internal-only: carries the hash, for password verification ---

export async function getAuthUserById(id: string): Promise<AuthUser | undefined> {
  const [row] = await db.select().from(users).where(eq(users.id, id));
  return row ? toAuthUser(row) : undefined;
}

// --- Mutations (director-only, guarded by callers in lib/employee-actions.ts) ---

export async function createUser(input: {
  name: string;
  role: Role;
  siteId: SiteId;
  passwordHash: string;
}): Promise<User> {
  const [row] = await db
    .insert(users)
    .values({
      name: input.name,
      role: input.role,
      siteId: input.siteId,
      passwordHash: input.passwordHash,
    })
    .returning();
  return stripHash(toAuthUser(row));
}

export async function renameUser(id: string, name: string): Promise<void> {
  await db.update(users).set({ name }).where(eq(users.id, id));
}

export async function deleteUser(id: string): Promise<void> {
  // Defense in depth: the UI never exposes deleting the director, but a
  // server action is reachable by direct POST regardless of what's hidden.
  const [row] = await db.select().from(users).where(eq(users.id, id));
  if (!row || row.role === "director") return;
  await db.delete(users).where(eq(users.id, id));
}

export async function setUserPassword(id: string, passwordHash: string): Promise<void> {
  await db.update(users).set({ passwordHash }).where(eq(users.id, id));
}

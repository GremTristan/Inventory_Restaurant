import "server-only";

import fs from "fs";
import path from "path";
import { randomUUID } from "crypto";
import bcrypt from "bcryptjs";
import type { AuthUser, Role, SiteId, User } from "@/types";
import { initialUsers } from "@/data/users";

// File-backed store for user accounts (directory + hashed PINs). Kept
// separate from site-config.json/sales-config.json so that a credentials
// write never touches stock or sales data — same rationale as the split
// already documented in sales-store.ts.
const DATA_FILE = path.join(process.cwd(), "data", "user-config.json");

interface StoreData {
  users: AuthUser[];
}

function seed(): StoreData {
  return {
    users: initialUsers.map((seedUser) => ({
      id: seedUser.id,
      name: seedUser.name,
      role: seedUser.role,
      siteId: seedUser.siteId,
      passwordHash: bcrypt.hashSync(seedUser.defaultPin, 10),
    })),
  };
}

function readStore(): StoreData {
  if (!fs.existsSync(DATA_FILE)) {
    const data = seed();
    writeStore(data);
    return data;
  }
  const raw = fs.readFileSync(DATA_FILE, "utf-8");
  return JSON.parse(raw) as StoreData;
}

function writeStore(data: StoreData) {
  const tmpFile = `${DATA_FILE}.${process.pid}.tmp`;
  fs.writeFileSync(tmpFile, JSON.stringify(data, null, 2), "utf-8");
  fs.renameSync(tmpFile, DATA_FILE);
}

function stripHash(authUser: AuthUser): User {
  const { passwordHash: _passwordHash, ...publicUser } = authUser;
  return publicUser;
}

// --- Public reads (never expose passwordHash) ---

export function getAllUsers(): User[] {
  return readStore().users.map(stripHash);
}

export function getUserById(id: string): User | undefined {
  const authUser = readStore().users.find((u) => u.id === id);
  return authUser ? stripHash(authUser) : undefined;
}

export function getUsersBySite(siteId: SiteId): User[] {
  return readStore()
    .users.filter((u) => u.siteId === siteId)
    .map(stripHash);
}

// --- Internal-only: carries the hash, for password verification ---

export function getAuthUserById(id: string): AuthUser | undefined {
  return readStore().users.find((u) => u.id === id);
}

// --- Mutations (director-only, guarded by callers in lib/employee-actions.ts) ---

export function createUser(input: {
  name: string;
  role: Role;
  siteId: SiteId;
  passwordHash: string;
}): User {
  const data = readStore();
  const authUser: AuthUser = {
    id: randomUUID(),
    name: input.name,
    role: input.role,
    siteId: input.siteId,
    passwordHash: input.passwordHash,
  };
  data.users.push(authUser);
  writeStore(data);
  return stripHash(authUser);
}

export function renameUser(id: string, name: string) {
  const data = readStore();
  const user = data.users.find((u) => u.id === id);
  if (!user) return;
  user.name = name;
  writeStore(data);
}

export function deleteUser(id: string) {
  const data = readStore();
  const user = data.users.find((u) => u.id === id);
  // Defense in depth: the UI never exposes deleting the director, but a
  // server action is reachable by direct POST regardless of what's hidden.
  if (!user || user.role === "director") return;
  data.users = data.users.filter((u) => u.id !== id);
  writeStore(data);
}

export function setUserPassword(id: string, passwordHash: string) {
  const data = readStore();
  const user = data.users.find((u) => u.id === id);
  if (!user) return;
  user.passwordHash = passwordHash;
  writeStore(data);
}

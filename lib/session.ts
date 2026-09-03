import "server-only";

import { cookies } from "next/headers";
import { cache } from "react";
import { getUserById } from "@/lib/user-store";
import { getTenantById, isTenantUsable } from "@/lib/tenant-store";
import { getSiteById } from "@/lib/site-store";
import {
  DEVICE_COOKIE,
  DEVICE_SECONDS,
  DIRECTOR_SESSION_SECONDS,
  SESSION_COOKIE,
  STAFF_SESSION_SECONDS,
  signToken,
  verifyToken,
} from "@/lib/auth/token";
import type { Role, Site, SiteId, Tenant, User } from "@/types";

export { SESSION_COOKIE, DEVICE_COOKIE };

export class UnauthorizedError extends Error {
  constructor(message = "Accès refusé") {
    super(message);
    this.name = "UnauthorizedError";
  }
}

export interface SessionContext {
  user: User;
  // Null only for super-admins.
  tenant: Tenant | null;
}

// Verifies the signed cookie, then re-reads the account so a deactivated
// user or a suspended tenant is cut off immediately, not at token expiry.
// Memoized per request (React cache) — layouts and pages both call it.
export const getSession = cache(async (): Promise<SessionContext | null> => {
  const cookieStore = await cookies();
  const payload = await verifyToken(cookieStore.get(SESSION_COOKIE)?.value, "session");
  if (!payload) return null;

  const user = await getUserById(payload.uid);
  if (!user || !user.active) return null;
  // Token claims must still match the account (role/tenant/site changes revoke).
  if (user.role !== payload.role || user.tenantId !== payload.tid) return null;
  if ((user.role === "cook" || user.role === "waiter") && user.siteId !== payload.sid) return null;

  if (user.role === "superadmin") return { user, tenant: null };
  if (!user.tenantId) return null;
  const tenant = await getTenantById(user.tenantId);
  if (!tenant) return null;
  return { user, tenant };
});

export async function getCurrentUser(): Promise<User | null> {
  const session = await getSession();
  return session?.user ?? null;
}

export async function createSession(user: User): Promise<void> {
  const isStaff = user.role === "cook" || user.role === "waiter";
  const maxAge = isStaff ? STAFF_SESSION_SECONDS : DIRECTOR_SESSION_SECONDS;
  const token = await signToken({
    v: 1,
    kind: "session",
    uid: user.id,
    tid: user.tenantId,
    role: user.role,
    sid: user.siteId,
    exp: Math.floor(Date.now() / 1000) + maxAge,
  });
  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge,
  });
}

export async function destroySession(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(SESSION_COOKIE);
}

// --- Shared tablet binding ---

export async function bindDeviceToSite(site: Site): Promise<void> {
  const token = await signToken({
    v: 1,
    kind: "device",
    tid: site.tenantId,
    sid: site.id,
    exp: Math.floor(Date.now() / 1000) + DEVICE_SECONDS,
  });
  const cookieStore = await cookies();
  cookieStore.set(DEVICE_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: DEVICE_SECONDS,
  });
}

export async function unbindDevice(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(DEVICE_COOKIE);
}

export async function getDeviceSite(): Promise<Site | null> {
  const cookieStore = await cookies();
  const payload = await verifyToken(cookieStore.get(DEVICE_COOKIE)?.value, "device");
  if (!payload) return null;
  const site = await getSiteById(payload.sid);
  if (!site || !site.active || site.tenantId !== payload.tid) return null;
  return site;
}

// --- Guards for Server Actions (reachable by direct POST regardless of UI) ---

export async function requireSession(): Promise<SessionContext> {
  const session = await getSession();
  if (!session) throw new UnauthorizedError();
  return session;
}

function assertTenantUsable(session: SessionContext) {
  if (session.tenant && !isTenantUsable(session.tenant)) {
    throw new UnauthorizedError("Abonnement inactif");
  }
}

export async function requireDirector(options: { allowInactiveTenant?: boolean } = {}): Promise<SessionContext & { tenant: Tenant }> {
  const session = await requireSession();
  if (session.user.role !== "director" || !session.tenant) throw new UnauthorizedError();
  if (!options.allowInactiveTenant) assertTenantUsable(session);
  return session as SessionContext & { tenant: Tenant };
}

export async function requireSuperAdmin(): Promise<SessionContext> {
  const session = await requireSession();
  if (session.user.role !== "superadmin") throw new UnauthorizedError();
  return session;
}

// Site-scoped guard. Directors pass for any site of THEIR tenant. Staff must
// belong to that exact site and, if `allow` is given, hold one of the roles.
// Returns the verified site so callers never re-trust the client's siteId.
export async function requireSiteAccess(
  siteId: SiteId,
  allow?: Role[]
): Promise<SessionContext & { tenant: Tenant; site: Site }> {
  const session = await requireSession();
  const { user, tenant } = session;
  if (!tenant) throw new UnauthorizedError();
  assertTenantUsable(session);

  const site = await getSiteById(siteId);
  if (!site || site.tenantId !== tenant.id) throw new UnauthorizedError();

  if (user.role === "director") return { ...session, tenant, site };
  if (allow && !allow.includes(user.role)) throw new UnauthorizedError();
  if (user.siteId !== site.id) throw new UnauthorizedError();
  return { ...session, tenant, site };
}

// Where a signed-in user lands.
export function homePathFor(user: User): string {
  switch (user.role) {
    case "superadmin":
      return "/admin";
    case "director":
      return "/direction";
    case "cook":
      return `/s/${user.siteId}/cuisine`;
    case "waiter":
      return `/s/${user.siteId}/service`;
  }
}

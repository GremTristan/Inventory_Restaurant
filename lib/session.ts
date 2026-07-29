import { cookies } from "next/headers";
import { getUserById } from "@/lib/user-store";
import type { Role, SiteId, User } from "@/types";

const SESSION_COOKIE = "session_user_id";

// Mock auth: the cookie just holds a user id from the mock directory.
// Swap this module for real session verification once a DB/auth
// provider is introduced — callers only depend on getCurrentUser().
export async function getCurrentUser(): Promise<User | null> {
  const cookieStore = await cookies();
  const userId = cookieStore.get(SESSION_COOKIE)?.value;
  if (!userId) return null;
  return getUserById(userId) ?? null;
}

export async function createSession(userId: string) {
  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE, userId, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 7,
  });
}

export async function destroySession() {
  const cookieStore = await cookies();
  cookieStore.delete(SESSION_COOKIE);
}

// Shared guard for server actions restricted to directors. Throws if the
// caller isn't authenticated as a director — actions must call this
// unconditionally since Server Functions are reachable via direct POST,
// independent of what the UI hides.
export async function requireDirector(): Promise<User> {
  const user = await getCurrentUser();
  if (!user || user.role !== "director") {
    throw new Error("Unauthorized");
  }
  return user;
}

// Shared guard for server actions scoped to a single site. Directors always
// pass (they can act on any site). Everyone else must both belong to that
// site and, if `allow` is given, hold one of the listed roles — e.g. daily
// sales entry is restricted to waiters (+ directors), while marking a
// reminder done is open to any role at that site.
export async function requireSiteAccess(siteId: SiteId, allow?: Role[]): Promise<User> {
  const user = await getCurrentUser();
  if (!user) {
    throw new Error("Unauthorized");
  }
  if (user.role === "director") {
    return user;
  }
  if (allow && !allow.includes(user.role)) {
    throw new Error("Unauthorized");
  }
  if (user.siteId !== siteId) {
    throw new Error("Unauthorized");
  }
  return user;
}

export { SESSION_COOKIE };

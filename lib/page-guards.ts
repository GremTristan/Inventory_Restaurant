import "server-only";

import { redirect } from "next/navigation";
import {
  requireDirector,
  requireSession,
  requireSiteAccess,
  requireSuperAdmin,
  UnauthorizedError,
  type SessionContext,
} from "@/lib/session";
import type { Role, Site, Tenant } from "@/types";

// Page-side counterparts of the Server Action guards: same checks, but a
// failure becomes a redirect (to sign-in when signed out, to the refusal
// page otherwise) instead of a thrown error.
async function guarded<T>(fn: () => Promise<T>): Promise<T> {
  try {
    return await fn();
  } catch (error) {
    if (error instanceof UnauthorizedError) {
      const session = await requireSession().catch(() => null);
      if (!session) redirect("/connexion");
      if (error.message === "Abonnement inactif") {
        redirect(session.user.role === "director" ? "/direction/abonnement" : "/acces-refuse?raison=abonnement");
      }
      redirect("/acces-refuse");
    }
    throw error;
  }
}

export function pageSession(): Promise<SessionContext> {
  return guarded(() => requireSession());
}

export function pageDirector(options?: { allowInactiveTenant?: boolean }): Promise<SessionContext & { tenant: Tenant }> {
  return guarded(() => requireDirector(options));
}

export function pageSuperAdmin(): Promise<SessionContext> {
  return guarded(() => requireSuperAdmin());
}

export function pageSite(siteId: string, allow?: Role[]): Promise<SessionContext & { tenant: Tenant; site: Site }> {
  return guarded(() => requireSiteAccess(siteId, allow));
}

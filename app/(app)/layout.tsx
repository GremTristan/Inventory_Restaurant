import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/session";
import { getPendingRemindersForRole } from "@/lib/sales-store";
import { sites } from "@/data/sites";
import { Sidebar } from "@/components/sidebar";
import { AvatarWidget } from "@/components/avatar-widget";
import { SalesFormBridgeProvider } from "@/lib/sales-form-bridge";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const hasOwnPendingReminder =
    user.role !== "director" && user.siteId
      ? getPendingRemindersForRole(user.siteId, user.role).length > 0
      : false;
  const aiConfigured = Boolean(process.env.OLLAMA_API_KEY);

  return (
    // Wraps both <main> and AvatarWidget so the globally-mounted widget can
    // reach into whichever page-specific DailySalesForm is currently
    // mounted under {children} — see lib/sales-form-bridge.tsx. This layout
    // itself stays a Server Component; the provider is its own "use client"
    // boundary.
    <SalesFormBridgeProvider>
      <div className="flex min-h-screen flex-col bg-background md:flex-row">
        <Sidebar user={user} hasOwnPendingReminder={hasOwnPendingReminder} />
        {/* pb-24 reserves room for the fixed mobile bottom tab bar (see
            sidebar.tsx); md:pb-8 removes that reservation once the desktop
            sidebar takes over and the bottom bar disappears via md:hidden. */}
        <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-6 pb-24 sm:px-6 sm:py-8 md:pb-8">{children}</main>
        {/* Director's siteId is null (sees every site) — the widget's form
            still needs *some* siteId to pass requireSiteAccess/getSiteById
            validation, so it falls back to the first site. This has no effect
            on what the director sees: the director branch of
            buildContextForUser (lib/ai-avatar-actions.ts) ignores siteId
            entirely and is always group-wide. */}
        <AvatarWidget siteId={user.siteId ?? sites[0].id} aiConfigured={aiConfigured} />
      </div>
    </SalesFormBridgeProvider>
  );
}

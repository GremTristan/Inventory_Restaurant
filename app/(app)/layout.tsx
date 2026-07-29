import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/session";
import { getPendingRemindersForRole } from "@/lib/sales-store";
import { sites } from "@/data/sites";
import { Sidebar } from "@/components/sidebar";
import { AvatarWidget } from "@/components/avatar-widget";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const hasOwnPendingReminder =
    user.role !== "director" && user.siteId
      ? getPendingRemindersForRole(user.siteId, user.role).length > 0
      : false;
  const aiConfigured = Boolean(process.env.OLLAMA_API_KEY);

  return (
    <div className="flex min-h-screen flex-col bg-background md:flex-row">
      <Sidebar user={user} hasOwnPendingReminder={hasOwnPendingReminder} />
      <main className="mx-auto w-full max-w-6xl flex-1 px-6 py-8">{children}</main>
      {/* Director's siteId is null (sees every site) — the widget's form
          still needs *some* siteId to pass requireSiteAccess/getSiteById
          validation, so it falls back to the first site. This has no effect
          on what the director sees: the director branch of
          buildContextForUser (lib/ai-avatar-actions.ts) ignores siteId
          entirely and is always group-wide. */}
      <AvatarWidget siteId={user.siteId ?? sites[0].id} aiConfigured={aiConfigured} />
    </div>
  );
}

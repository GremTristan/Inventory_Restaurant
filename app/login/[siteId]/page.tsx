import Link from "next/link";
import { notFound } from "next/navigation";
import { getAllUsers } from "@/lib/user-store";
import { getSiteById } from "@/data/sites";
import { hasPendingReminderForRole } from "@/lib/sales-store";
import { LoginUserList } from "@/components/login-user-list";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Clock } from "@/components/clock";
import type { SiteId } from "@/types";

export default async function LoginSitePage({
  params,
}: {
  params: Promise<{ siteId: string }>;
}) {
  const { siteId } = await params;
  const isDirection = siteId === "direction";
  const site = isDirection ? null : getSiteById(siteId);

  if (!isDirection && !site) notFound();

  const users = getAllUsers();
  const siteUsers = isDirection
    ? users.filter((user) => user.role === "director")
    : users.filter(
        (user) => (user.role === "manager" || user.role === "waiter") && user.siteId === siteId
      );

  if (siteUsers.length === 0) notFound();

  const pendingUserIds = new Set(
    siteUsers
      .filter((user) => !isDirection && hasPendingReminderForRole(site!.id as SiteId, user.role))
      .map((user) => user.id)
  );

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-background px-4 sm:px-6">
      <Clock className="text-center text-sm" />
      <Card className="w-full max-w-sm">
        <CardHeader>
          <p className="text-xs font-semibold uppercase tracking-wide text-accent">
            Crêperies Inventory
          </p>
          <CardTitle className="text-lg text-foreground">
            {isDirection ? "Direction" : site!.name}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <LoginUserList users={siteUsers} pendingUserIds={pendingUserIds} />
        </CardContent>
      </Card>
      <Link
        href="/login"
        className="rounded-sm text-sm text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-background"
      >
        ← Changer d&apos;établissement
      </Link>
    </div>
  );
}

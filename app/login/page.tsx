import Link from "next/link";
import { sites } from "@/data/sites";
import { getAllUsers } from "@/lib/user-store";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Clock } from "@/components/clock";

export default async function LoginPage() {
  const users = getAllUsers();
  const hasDirector = users.some((user) => user.role === "director");

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-background px-4">
      <Clock className="text-center text-sm" />
      <Card className="w-full max-w-sm">
        <CardHeader>
          <p className="text-xs font-semibold uppercase tracking-wide text-accent">
            Crêperies Inventory
          </p>
          <CardTitle className="text-lg text-foreground">Choisissez votre établissement</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-2">
          {sites.map((site) => (
            <Link
              key={site.id}
              href={`/login/${site.id}`}
              className="inline-flex w-full items-center justify-between rounded-md border border-border bg-card px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-background"
            >
              {site.name}
            </Link>
          ))}
        </CardContent>
      </Card>
      {hasDirector && (
        <Card className="w-full max-w-sm">
          <CardHeader>
            <CardTitle className="text-lg text-foreground">Accès direction</CardTitle>
          </CardHeader>
          <CardContent>
            <Link
              href="/login/direction"
              className="inline-flex w-full items-center justify-center rounded-md border border-border bg-card px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-background"
            >
              Direction
            </Link>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

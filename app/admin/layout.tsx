import Link from "next/link";
import type { Metadata } from "next";
import { LogOut, ShieldCheck } from "lucide-react";
import { logoutAction } from "@/lib/auth/actions";
import { pageSuperAdmin } from "@/lib/page-guards";

export const metadata: Metadata = { title: { default: "Éditeur", template: "%s · Éditeur" }, robots: { index: false } };

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const { user } = await pageSuperAdmin();
  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-sidebar-background text-sidebar-foreground">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3 sm:px-6">
          <Link href="/admin" className="flex items-center gap-2 font-bold">
            <ShieldCheck className="h-5 w-5 text-accent" /> Console éditeur
          </Link>
          <nav className="flex items-center gap-1 text-sm">
            <Link href="/admin" className="rounded-pill px-3 py-2 hover:bg-sidebar-accent">
              Clients
            </Link>
            <Link href="/admin/compte" className="rounded-pill px-3 py-2 hover:bg-sidebar-accent">
              Mon compte
            </Link>
            <form action={logoutAction}>
              <button type="submit" className="flex items-center gap-2 rounded-pill px-3 py-2 text-sidebar-muted-foreground hover:bg-sidebar-accent hover:text-sidebar-foreground">
                <LogOut className="h-4 w-4" /> {user.name}
              </button>
            </form>
          </nav>
        </div>
      </header>
      <main className="mx-auto w-full max-w-6xl px-4 py-6 sm:px-6">{children}</main>
    </div>
  );
}

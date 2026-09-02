import Link from "next/link";
import type { Metadata } from "next";
import { ArrowRight, CheckCircle2, Circle } from "lucide-react";
import { PageHeader, Stat } from "@/components/direction/ui";
import { addDays, formatDayLabel, startOfWeek, todayPeriod } from "@/lib/dates";
import { getInventoryForTenant, isLowStock } from "@/lib/inventory-store";
import { getMenuForTenant } from "@/lib/menu-store";
import { formatMoney } from "@/lib/money";
import { getActiveOrders } from "@/lib/order-store";
import { pageDirector } from "@/lib/page-guards";
import { salesReport } from "@/lib/reports";
import { getSitesForTenant } from "@/lib/site-store";
import { getUsersForTenant } from "@/lib/user-store";

export const metadata: Metadata = { title: "Tableau de bord" };

export default async function DirectionHome({ searchParams }: { searchParams: Promise<{ bienvenue?: string }> }) {
  const { bienvenue } = await searchParams;
  const { user, tenant } = await pageDirector({ allowInactiveTenant: true });
  const today = todayPeriod();
  const weekStart = startOfWeek(today);

  const sites = await getSitesForTenant(tenant.id);
  const activeSites = sites.filter((s) => s.active);
  const [todayReport, weekReport, lastWeekReport, inventory, menu, users, activeByStie] = await Promise.all([
    salesReport(tenant.id, activeSites, today, today),
    salesReport(tenant.id, activeSites, weekStart, today),
    salesReport(tenant.id, activeSites, addDays(weekStart, -7), addDays(today, -7)),
    getInventoryForTenant(tenant.id),
    getMenuForTenant(tenant.id),
    getUsersForTenant(tenant.id),
    Promise.all(activeSites.map((s) => getActiveOrders(s.id))),
  ]);

  const staffCount = users.filter((u) => u.role !== "director").length;
  const low = inventory.filter(isLowStock);
  const inProgress = activeByStie.reduce((n, list) => n + list.length, 0);
  const weekDelta = lastWeekReport.total > 0 ? ((weekReport.total - lastWeekReport.total) / lastWeekReport.total) * 100 : null;

  const steps = [
    { done: true, label: "Établissement créé", href: "/direction/etablissements" },
    { done: menu.length > 0, label: "Vérifier la carte et les prix", href: "/direction/menu" },
    { done: staffCount > 0, label: "Ajouter serveurs et cuisiniers (nom + code à 4 chiffres)", href: "/direction/equipe" },
    { done: todayReport.count + weekReport.count > 0, label: "Relier une tablette avec le code établissement et passer une première commande", href: "/direction/etablissements" },
    { done: tenant.status === "active", label: "Choisir l’abonnement avant la fin de l’essai", href: "/direction/abonnement" },
  ];
  const showChecklist = bienvenue === "1" || steps.some((s) => !s.done);

  return (
    <>
      <PageHeader title={`Bonjour ${user.name.split(" ")[0]}`} description={`${tenant.name} · ${formatDayLabel(today)}`} />

      {showChecklist && (
        <section className="mb-8 rounded-card border border-accent/30 bg-accent/5 p-5">
          <h2 className="text-lg font-bold text-foreground">Mise en route</h2>
          <p className="text-sm text-muted-foreground">Cinq étapes, dix minutes, et votre équipe prend ses premières commandes.</p>
          <ul className="mt-4 grid gap-2 sm:grid-cols-2">
            {steps.map((step) => (
              <li key={step.label}>
                <Link
                  href={step.href}
                  className="flex min-h-12 items-center gap-3 rounded-control bg-card px-3 py-2 text-sm shadow-sm hover:bg-muted/60"
                >
                  {step.done ? <CheckCircle2 className="h-5 w-5 shrink-0 text-success" /> : <Circle className="h-5 w-5 shrink-0 text-muted-foreground" />}
                  <span className={step.done ? "text-muted-foreground line-through" : "font-medium text-foreground"}>{step.label}</span>
                  <ArrowRight className="ml-auto h-4 w-4 text-muted-foreground" />
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label="Chiffre d’affaires du jour" value={formatMoney(todayReport.total, tenant.currency)} hint={`${todayReport.count} ticket${todayReport.count > 1 ? "s" : ""}`} tone="accent" />
        <Stat
          label="Semaine en cours"
          value={formatMoney(weekReport.total, tenant.currency)}
          hint={weekDelta === null ? "Pas de semaine précédente à comparer" : `${weekDelta >= 0 ? "+" : ""}${Math.round(weekDelta)} % vs semaine passée`}
        />
        <Stat label="Commandes en cours" value={String(inProgress)} hint="tous établissements" />
        <Stat label="Articles à commander" value={String(low.length)} tone={low.length > 0 ? "destructive" : undefined} hint={low.length > 0 ? "stock sous le seuil" : "stocks au-dessus des seuils"} />
      </div>

      <section className="mt-8">
        <h2 className="mb-3 text-lg font-bold text-foreground">Par établissement — aujourd’hui</h2>
        <div className="grid gap-3 md:grid-cols-2">
          {activeSites.map((site, index) => {
            const rev = todayReport.bySite.find((s) => s.siteId === site.id);
            const lowHere = low.filter((i) => i.siteId === site.id).length;
            return (
              <article key={site.id} className="rounded-card bg-card p-5 shadow-[0_1px_2px_rgba(20,24,27,0.04),0_8px_24px_-8px_rgba(20,24,27,0.08)]">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h3 className="text-lg font-bold text-foreground">{site.name}</h3>
                    <p className="text-2xl font-bold tabular-nums text-accent">{formatMoney(rev?.total ?? 0, tenant.currency)}</p>
                    <p className="text-sm text-muted-foreground">
                      {rev?.count ?? 0} ticket{(rev?.count ?? 0) > 1 ? "s" : ""} · {activeByStie[index].length} en cours
                      {lowHere > 0 && <span className="ml-2 font-semibold text-destructive">· {lowHere} à commander</span>}
                    </p>
                  </div>
                  <span className="rounded-pill bg-muted px-3 py-1 font-mono text-sm font-bold tracking-widest">{site.deviceCode}</span>
                </div>
                <div className="mt-4 flex flex-wrap gap-2 text-sm">
                  <Link href={`/s/${site.id}/service`} className="min-h-11 inline-flex items-center rounded-pill bg-muted px-4 font-medium hover:bg-border/60">
                    Écran service
                  </Link>
                  <Link href={`/s/${site.id}/cuisine`} className="min-h-11 inline-flex items-center rounded-pill bg-muted px-4 font-medium hover:bg-border/60">
                    Écran cuisine
                  </Link>
                  <Link href={`/direction/ventes?site=${site.id}`} className="min-h-11 inline-flex items-center rounded-pill px-4 font-medium text-accent hover:bg-accent/10">
                    Rapport détaillé →
                  </Link>
                </div>
              </article>
            );
          })}
        </div>
      </section>

      {weekReport.topProducts.length > 0 && (
        <section className="mt-8">
          <h2 className="mb-3 text-lg font-bold text-foreground">Meilleures ventes de la semaine</h2>
          <ol className="grid gap-2 sm:grid-cols-2 lg:grid-cols-5">
            {weekReport.topProducts.slice(0, 5).map((p, i) => (
              <li key={p.menuItemId} className="rounded-card bg-card p-4 shadow-sm">
                <p className="text-xs font-semibold text-muted-foreground">#{i + 1}</p>
                <p className="truncate font-semibold text-foreground">{p.name}</p>
                <p className="text-sm text-muted-foreground">
                  {p.quantity} vendus · {formatMoney(p.revenue, tenant.currency)}
                </p>
              </li>
            ))}
          </ol>
        </section>
      )}
    </>
  );
}

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
        <section className="mb-8 rounded-lg border border-border bg-card p-5">
          <h2 className="text-[15px] font-semibold tracking-tight text-foreground">Mise en route</h2>
          <p className="mt-0.5 text-[13px] text-muted-foreground">Cinq étapes, dix minutes, et votre équipe prend ses premières commandes.</p>
          <ul className="mt-4 grid gap-2 sm:grid-cols-2">
            {steps.map((step) => (
              <li key={step.label}>
                <Link
                  href={step.href}
                  className="flex min-h-10 items-center gap-3 rounded-md border border-border bg-background px-3 py-2 text-[13px] hover:bg-muted/60"
                >
                  {step.done ? <CheckCircle2 className="h-4 w-4 shrink-0 text-success" /> : <Circle className="h-4 w-4 shrink-0 text-muted-foreground" />}
                  <span className={step.done ? "text-muted-foreground line-through" : "font-medium text-foreground"}>{step.label}</span>
                  <ArrowRight className="ml-auto h-3.5 w-3.5 text-muted-foreground" />
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
        <h2 className="mb-3 text-[15px] font-semibold tracking-tight text-foreground">Par établissement — aujourd’hui</h2>
        <div className="grid gap-3 md:grid-cols-2">
          {activeSites.map((site, index) => {
            const rev = todayReport.bySite.find((s) => s.siteId === site.id);
            const lowHere = low.filter((i) => i.siteId === site.id).length;
            return (
              <article key={site.id} className="rounded-lg border border-border bg-card p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h3 className="text-[14px] font-semibold tracking-tight text-foreground">{site.name}</h3>
                    <p className="mt-1 font-mono text-[22px] font-semibold tracking-tight tabular-nums text-foreground">
                      {formatMoney(rev?.total ?? 0, tenant.currency)}
                    </p>
                    <p className="mt-1 text-[12px] text-muted-foreground">
                      {rev?.count ?? 0} ticket{(rev?.count ?? 0) > 1 ? "s" : ""} · {activeByStie[index].length} en cours
                      {lowHere > 0 && <span className="ml-2 font-medium text-destructive">· {lowHere} à commander</span>}
                    </p>
                  </div>
                  <span className="rounded-md border border-border bg-muted px-2 py-0.5 font-mono text-[11px] font-medium tracking-widest text-muted-foreground">
                    {site.deviceCode}
                  </span>
                </div>
                <div className="mt-4 flex flex-wrap gap-2 text-[13px]">
                  <Link href={`/s/${site.id}/service`} className="inline-flex h-8 items-center rounded-md border border-border bg-background px-3 font-medium hover:bg-muted">
                    Service
                  </Link>
                  <Link href={`/s/${site.id}/cuisine`} className="inline-flex h-8 items-center rounded-md border border-border bg-background px-3 font-medium hover:bg-muted">
                    Cuisine
                  </Link>
                  <Link href={`/direction/ventes?site=${site.id}`} className="inline-flex h-8 items-center rounded-md px-3 font-medium text-accent hover:bg-accent/10">
                    Rapport →
                  </Link>
                </div>
              </article>
            );
          })}
        </div>
      </section>

      {weekReport.topProducts.length > 0 && (
        <section className="mt-8">
          <h2 className="mb-3 text-[15px] font-semibold tracking-tight text-foreground">Meilleures ventes de la semaine</h2>
          <ol className="grid gap-2 sm:grid-cols-2 lg:grid-cols-5">
            {weekReport.topProducts.slice(0, 5).map((p, i) => (
              <li key={p.menuItemId} className="rounded-lg border border-border bg-card p-3.5">
                <p className="font-mono text-[11px] font-medium text-muted-foreground">#{i + 1}</p>
                <p className="mt-1 truncate text-[13px] font-semibold text-foreground">{p.name}</p>
                <p className="mt-0.5 text-[12px] text-muted-foreground">
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

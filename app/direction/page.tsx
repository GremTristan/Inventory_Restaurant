import Link from "next/link";
import type { Metadata } from "next";
import { ActionFeed, AttentionSummary } from "@/components/direction/action-feed";
import { formatDayLabel, todayPeriod } from "@/lib/dates";
import { buildDirectorSituation } from "@/lib/intelligence/build-feed";
import { getInventoryForTenant } from "@/lib/inventory-store";
import { getMenuForTenant } from "@/lib/menu-store";
import { formatMoney } from "@/lib/money";
import { getActiveOrders } from "@/lib/order-store";
import { pageDirector } from "@/lib/page-guards";
import { salesReport } from "@/lib/reports";
import { getPendingReminders } from "@/lib/sales-store";
import { getSitesForTenant } from "@/lib/site-store";
import { getUsersForTenant } from "@/lib/user-store";

export const metadata: Metadata = { title: "Accueil" };

/**
 * Accueil = machine de priorisation (exception-first).
 *
 * INPUT     → inventory, orders, billing, setup, reminders
 * PIPELINE  → lib/intelligence (detect → prioritize → harness)
 * OUTPUT    → feed d'actions (problème → contexte → action)
 * LOOP      → action → tablette/écran métier → feedback toast/état
 * HARNESS   → max 8 items, pas d'achat autonome, KPIs décoratifs masqués
 */
export default async function DirectionHome() {
  const { user, tenant } = await pageDirector({ allowInactiveTenant: true });
  const today = todayPeriod();
  const monthStart = today.slice(0, 8) + "01";

  const sites = (await getSitesForTenant(tenant.id)).filter((s) => s.active);
  const [todayReport, monthReport, inventory, menu, users, activeBySite, remindersBySite] = await Promise.all([
    salesReport(tenant.id, sites, today, today),
    salesReport(tenant.id, sites, monthStart, today),
    getInventoryForTenant(tenant.id),
    getMenuForTenant(tenant.id),
    getUsersForTenant(tenant.id),
    Promise.all(sites.map((s) => getActiveOrders(s.id))),
    Promise.all(sites.map((s) => getPendingReminders(s.id))),
  ]);

  // Inventaire mensuel : visible seulement après le 20 du mois (sinon bruit).
  const dayOfMonth = Number(today.slice(8, 10));
  const inventoryPendingBySite =
    dayOfMonth >= 20
      ? remindersBySite.map((r) => r.some((x) => x.kind === "monthly-inventory"))
      : sites.map(() => false);

  const { actions, attentionCount } = buildDirectorSituation({
    tenant,
    sites,
    inventory,
    menuCount: menu.length,
    staff: users,
    hasOrders: monthReport.count > 0 || sites.some((_, i) => (activeBySite[i]?.length ?? 0) > 0),
    activeBySite,
    inventoryPendingBySite,
  });

  const infoOnly = actions.filter((a) => a.severity === "info").length;
  const firstName = user.name.split(" ")[0];
  const inProgress = activeBySite.reduce((n, list) => n + list.length, 0);
  const primarySite = sites[0];

  return (
    <div className="mx-auto w-full max-w-lg md:max-w-5xl">
      <header className="mb-5 border-b border-border pb-4">
        <p className="text-[12px] font-medium uppercase tracking-[0.04em] text-muted-foreground">
          {tenant.name} · {formatDayLabel(today)}
        </p>
        <h1 className="mt-1 text-[22px] font-semibold tracking-tight text-foreground">Bonjour {firstName}</h1>
        <div className="mt-2">
          <AttentionSummary criticalOrAttention={attentionCount} infoOnly={infoOnly} />
        </div>
      </header>

      {/* FEED — À FAIRE */}
      <section aria-labelledby="feed-title">
        <div className="mb-2.5 flex items-baseline justify-between gap-3">
          <h2 id="feed-title" className="text-[13px] font-semibold uppercase tracking-[0.04em] text-muted-foreground">
            À faire
          </h2>
          {actions.length > 0 && (
            <span className="font-mono text-[12px] tabular-nums text-muted-foreground">{actions.length}</span>
          )}
        </div>
        <ActionFeed actions={actions} />
      </section>

      {/* Glance strip — only decision-useful context, not dashboard sprawl */}
      <section className="mt-6 grid grid-cols-2 gap-2 sm:grid-cols-3" aria-label="Coup d’œil">
        <Link
          href="/direction/ventes"
          className="rounded-lg border border-border bg-card px-3 py-3 hover:bg-muted/50"
        >
          <p className="text-[11px] font-medium uppercase tracking-[0.04em] text-muted-foreground">CA aujourd’hui</p>
          <p className="mt-1 font-mono text-[16px] font-semibold tabular-nums text-foreground">
            {formatMoney(todayReport.total, tenant.currency)}
          </p>
          <p className="mt-0.5 text-[11px] text-muted-foreground">{todayReport.count} ticket{todayReport.count > 1 ? "s" : ""}</p>
        </Link>
        <Link
          href={primarySite ? `/s/${primarySite.id}/service` : "/direction/etablissements"}
          className="rounded-lg border border-border bg-card px-3 py-3 hover:bg-muted/50"
        >
          <p className="text-[11px] font-medium uppercase tracking-[0.04em] text-muted-foreground">En cours</p>
          <p className="mt-1 font-mono text-[16px] font-semibold tabular-nums text-foreground">{inProgress}</p>
          <p className="mt-0.5 text-[11px] text-muted-foreground">commandes actives</p>
        </Link>
        <Link
          href="/direction/stock"
          className="col-span-2 rounded-lg border border-border bg-card px-3 py-3 hover:bg-muted/50 sm:col-span-1"
        >
          <p className="text-[11px] font-medium uppercase tracking-[0.04em] text-muted-foreground">Établissements</p>
          <p className="mt-1 font-mono text-[16px] font-semibold tabular-nums text-foreground">{sites.length}</p>
          <p className="mt-0.5 text-[11px] text-muted-foreground">actifs</p>
        </Link>
      </section>

      {/* Site shortcuts — thumb reach for ops jump */}
      {sites.length > 0 && (
        <section className="mt-6" aria-labelledby="sites-title">
          <h2 id="sites-title" className="mb-2.5 text-[13px] font-semibold uppercase tracking-[0.04em] text-muted-foreground">
            Accès rapide
          </h2>
          <ul className="flex flex-col gap-2">
            {sites.map((site, index) => {
              const active = activeBySite[index]?.length ?? 0;
              const lowHere = inventory.filter((i) => i.siteId === site.id && i.lowStockThreshold !== null && i.quantity <= i.lowStockThreshold).length;
              return (
                <li key={site.id} className="rounded-lg border border-border bg-card p-3">
                  <div className="flex items-center justify-between gap-2">
                    <div className="min-w-0">
                      <p className="truncate text-[14px] font-semibold text-foreground">{site.name}</p>
                      <p className="text-[12px] text-muted-foreground">
                        {active} en cours
                        {lowHere > 0 && <span className="text-destructive"> · {lowHere} stock</span>}
                      </p>
                    </div>
                    <span className="shrink-0 rounded-md border border-border bg-muted px-1.5 py-0.5 font-mono text-[10px] tracking-wider text-muted-foreground">
                      {site.deviceCode}
                    </span>
                  </div>
                  <div className="mt-2.5 flex gap-2">
                    <Link
                      href={`/s/${site.id}/service`}
                      className="inline-flex h-9 flex-1 items-center justify-center rounded-md border border-border bg-background text-[12px] font-medium hover:bg-muted"
                    >
                      Service
                    </Link>
                    <Link
                      href={`/s/${site.id}/stock`}
                      className="inline-flex h-9 flex-1 items-center justify-center rounded-md border border-border bg-background text-[12px] font-medium hover:bg-muted"
                    >
                      Stock
                    </Link>
                    <Link
                      href={`/direction/ventes?site=${site.id}`}
                      className="inline-flex h-9 flex-1 items-center justify-center rounded-md px-2 text-[12px] font-medium text-muted-foreground hover:bg-muted hover:text-foreground"
                    >
                      Ventes
                    </Link>
                  </div>
                </li>
              );
            })}
          </ul>
        </section>
      )}
    </div>
  );
}

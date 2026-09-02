import Link from "next/link";
import type { Metadata } from "next";
import { Search } from "lucide-react";
import { CreateForm } from "@/components/direction/forms";
import { PageHeader, Stat } from "@/components/direction/ui";
import { Input } from "@/components/ui/input";
import { lookupTenantByEmailAction } from "@/lib/admin-actions";
import { getTenantOverviews } from "@/lib/admin-store";
import { planOf } from "@/lib/billing/plans";
import { formatMoney } from "@/lib/money";
import { pageSuperAdmin } from "@/lib/page-guards";
import { TENANT_STATUS_LABEL } from "@/lib/tenant-status";
import { trialDaysLeft } from "@/lib/tenant-store";

export const metadata: Metadata = { title: "Clients" };

async function loadOverview() {
  const overviews = await getTenantOverviews();
  const active = overviews.filter((o) => o.tenant.status === "active");
  const trials = overviews.filter((o) => o.tenant.status === "trial");
  const mrr = active.reduce((sum, o) => sum + planOf(o.tenant).pricePerSite * Math.max(1, o.activeSites), 0);
  const staleCutoff = Date.now() - 14 * 24 * 60 * 60 * 1000;
  const atRisk = active.filter((o) => !o.lastOrderAt || new Date(o.lastOrderAt).getTime() < staleCutoff).length;
  return { overviews, active, trials, mrr, atRisk };
}

export default async function AdminHome() {
  await pageSuperAdmin();
  const { overviews, active, trials, mrr, atRisk } = await loadOverview();

  return (
    <>
      <PageHeader title="Clients" description={`${overviews.length} enseigne${overviews.length > 1 ? "s" : ""} inscrite${overviews.length > 1 ? "s" : ""}.`} />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label="Abonnés" value={String(active.length)} />
        <Stat label="Essais en cours" value={String(trials.length)} />
        <Stat label="Revenu mensuel estimé" value={formatMoney(mrr, "CHF")} hint="Selon les tarifs affichés" />
        <Stat label="Abonnés sans activité (14 j)" value={String(atRisk)} tone={atRisk ? "warning" : undefined} />
      </div>

      <section className="mt-6 rounded-card bg-card p-4 shadow-sm">
        <CreateForm action={lookupTenantByEmailAction} submitLabel="Ouvrir" resetOnSuccess={false} className="flex flex-wrap items-end gap-3">
          <label className="min-w-64 flex-1 text-sm font-medium">
            <span className="flex items-center gap-2">
              <Search className="h-4 w-4" /> Retrouver un client par e-mail de directeur
            </span>
            <Input name="email" type="email" placeholder="direction@enseigne.ch" className="mt-1 min-h-12" />
          </label>
        </CreateForm>
      </section>

      <section className="mt-6 overflow-hidden rounded-card bg-card shadow-sm">
        <table className="w-full text-sm">
          <thead className="bg-muted/60 text-left text-xs uppercase tracking-wide text-muted-foreground">
            <tr>
              <th className="px-4 py-3">Enseigne</th>
              <th className="px-4 py-3">Statut</th>
              <th className="px-4 py-3">Formule</th>
              <th className="px-4 py-3 text-right">Établissements</th>
              <th className="px-4 py-3 text-right">Comptes</th>
              <th className="px-4 py-3 text-right">Commandes 30 j</th>
              <th className="px-4 py-3">Dernière activité</th>
            </tr>
          </thead>
          <tbody>
            {overviews.length === 0 && (
              <tr>
                <td colSpan={7} className="px-4 py-10 text-center text-muted-foreground">
                  Aucun client pour le moment.
                </td>
              </tr>
            )}
            {overviews.map(({ tenant, sites, activeSites, users, ordersLast30Days, lastOrderAt }) => {
              const status = TENANT_STATUS_LABEL[tenant.status];
              const days = trialDaysLeft(tenant);
              return (
                <tr key={tenant.id} className="border-t border-border hover:bg-muted/40">
                  <td className="px-4 py-3">
                    <Link href={`/admin/${tenant.id}`} className="font-semibold text-foreground hover:underline">
                      {tenant.name}
                    </Link>
                    <p className="text-xs text-muted-foreground">{tenant.billingEmail ?? tenant.slug}</p>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex rounded-pill px-2.5 py-1 text-xs font-semibold ${status.tone}`}>
                      {status.label}
                      {days !== null ? ` · ${days} j` : ""}
                    </span>
                  </td>
                  <td className="px-4 py-3">{planOf(tenant).name}</td>
                  <td className="px-4 py-3 text-right tabular-nums">
                    {activeSites}
                    {sites !== activeSites ? <span className="text-muted-foreground"> / {sites}</span> : null}
                  </td>
                  <td className="px-4 py-3 text-right tabular-nums">{users}</td>
                  <td className="px-4 py-3 text-right tabular-nums">{ordersLast30Days}</td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {lastOrderAt ? new Date(lastOrderAt).toLocaleDateString("fr-CH", { day: "numeric", month: "short" }) : "—"}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </section>
    </>
  );
}

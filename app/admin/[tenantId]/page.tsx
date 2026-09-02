import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { ArrowLeft, ExternalLink } from "lucide-react";
import { ActionButton, CreateForm } from "@/components/direction/forms";
import { PageHeader, Stat } from "@/components/direction/ui";
import { ConfirmButton } from "@/components/ui/confirm-button";
import { Input } from "@/components/ui/input";
import { deleteTenantAction, extendTrialAction, resetDirectorPasswordAction, setTenantPlanAction, setTenantStatusAction } from "@/lib/admin-actions";
import { countOrdersLast30Days } from "@/lib/admin-store";
import { getAuditLogForTenant } from "@/lib/audit";
import { PLANS, planOf } from "@/lib/billing/plans";
import { pageSuperAdmin } from "@/lib/page-guards";
import { getSitesForTenant } from "@/lib/site-store";
import { TENANT_STATUS_LABEL } from "@/lib/tenant-status";
import { getTenantById, trialDaysLeft } from "@/lib/tenant-store";
import { getUsersForTenant } from "@/lib/user-store";
import { ROLE_LABELS, type TenantStatus } from "@/types";

export const metadata: Metadata = { title: "Fiche client" };

const STATUS_ACTIONS: { status: TenantStatus; label: string; variant: "primary" | "secondary" | "outline" }[] = [
  { status: "active", label: "Marquer abonné", variant: "primary" },
  { status: "suspended", label: "Suspendre l’accès", variant: "outline" },
  { status: "canceled", label: "Résilier", variant: "secondary" },
];

export default async function TenantPage({ params }: { params: Promise<{ tenantId: string }> }) {
  await pageSuperAdmin();
  const { tenantId } = await params;
  const tenant = await getTenantById(tenantId);
  if (!tenant) notFound();

  const [sites, users, orders30, log] = await Promise.all([
    getSitesForTenant(tenant.id),
    getUsersForTenant(tenant.id),
    countOrdersLast30Days(tenant.id),
    getAuditLogForTenant(tenant.id, 40),
  ]);
  const directors = users.filter((u) => u.role === "director");
  const status = TENANT_STATUS_LABEL[tenant.status];
  const days = trialDaysLeft(tenant);
  const userName = (id: string | null) => users.find((u) => u.id === id)?.name ?? (id ? "Éditeur" : "Système");

  return (
    <>
      <Link href="/admin" className="mb-4 inline-flex min-h-10 items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-4 w-4" /> Tous les clients
      </Link>
      <PageHeader
        title={tenant.name}
        description={`Inscrit le ${new Date(tenant.createdAt).toLocaleDateString("fr-CH")} · ${tenant.slug}`}
        action={
          <span className={`inline-flex rounded-pill px-3 py-1.5 text-sm font-semibold ${status.tone}`}>
            {status.label}
            {days !== null ? ` · ${days} jour${days === 1 ? "" : "s"}` : ""}
          </span>
        }
      />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label="Formule" value={planOf(tenant).name} />
        <Stat label="Établissements actifs" value={`${sites.filter((s) => s.active).length} / ${sites.length}`} />
        <Stat label="Comptes" value={String(users.length)} hint={`${directors.length} direction`} />
        <Stat label="Commandes 30 j" value={String(orders30)} tone={orders30 === 0 && tenant.status === "active" ? "warning" : undefined} />
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <section className="rounded-card bg-card p-5 shadow-sm">
          <h2 className="text-base font-bold">Abonnement</h2>
          <dl className="mt-3 grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-sm">
            <dt className="text-muted-foreground">Facturation</dt>
            <dd>{tenant.billingEmail ?? "—"}</dd>
            <dt className="text-muted-foreground">Client Stripe</dt>
            <dd>
              {tenant.stripeCustomerId ? (
                <a
                  href={`https://dashboard.stripe.com/customers/${tenant.stripeCustomerId}`}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1 text-accent hover:underline"
                >
                  Ouvrir dans Stripe <ExternalLink className="h-3.5 w-3.5" />
                </a>
              ) : (
                "Aucun (essai)"
              )}
            </dd>
            <dt className="text-muted-foreground">Raison sociale</dt>
            <dd>{tenant.legalName ?? "—"}</dd>
          </dl>

          <div className="mt-4 flex flex-wrap gap-2">
            {STATUS_ACTIONS.filter((a) => a.status !== tenant.status).map((a) => (
              <ActionButton key={a.status} action={setTenantStatusAction} fields={{ tenantId: tenant.id, status: a.status }} variant={a.variant} size="sm" message="Statut mis à jour">
                {a.label}
              </ActionButton>
            ))}
          </div>

          <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-border pt-4">
            <span className="text-sm text-muted-foreground">Formule :</span>
            {PLANS.map((p) => (
              <ActionButton
                key={p.id}
                action={setTenantPlanAction}
                fields={{ tenantId: tenant.id, plan: p.id }}
                variant={tenant.plan === p.id ? "primary" : "outline"}
                size="sm"
                disabled={tenant.plan === p.id}
                message={`Formule ${p.name} appliquée`}
              >
                {p.name}
              </ActionButton>
            ))}
          </div>

          <form action={extendTrialAction} className="mt-4 flex flex-wrap items-center gap-2 border-t border-border pt-4">
            <input type="hidden" name="tenantId" value={tenant.id} />
            <span className="text-sm text-muted-foreground">Prolonger l’essai de</span>
            <Input name="days" type="number" min={1} max={90} defaultValue={14} className="min-h-11 w-20" />
            <span className="text-sm text-muted-foreground">jours</span>
            <button type="submit" className="min-h-11 rounded-pill bg-muted px-4 text-sm font-semibold hover:bg-border/60">
              Prolonger
            </button>
          </form>
        </section>

        <section className="rounded-card bg-card p-5 shadow-sm">
          <h2 className="text-base font-bold">Établissements</h2>
          <ul className="mt-3 divide-y divide-border text-sm">
            {sites.map((s) => (
              <li key={s.id} className="flex items-center justify-between py-2">
                <span className={s.active ? "" : "text-muted-foreground line-through"}>{s.name}</span>
                <span className="font-mono text-xs text-muted-foreground">code {s.deviceCode}</span>
              </li>
            ))}
            {sites.length === 0 && <li className="py-2 text-muted-foreground">Aucun établissement.</li>}
          </ul>

          <h2 className="mt-6 text-base font-bold">Comptes direction</h2>
          <ul className="mt-3 divide-y divide-border text-sm">
            {directors.map((d) => (
              <li key={d.id} className="py-3">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-semibold">{d.name}</p>
                    <p className="text-xs text-muted-foreground">{d.email}</p>
                  </div>
                  {!d.active && <span className="text-xs text-muted-foreground">désactivé</span>}
                </div>
                <details className="mt-2">
                  <summary className="cursor-pointer text-xs text-accent">Réinitialiser le mot de passe (support)</summary>
                  <CreateForm action={resetDirectorPasswordAction} submitLabel="Réinitialiser" className="mt-2 flex flex-wrap items-end gap-2">
                    <input type="hidden" name="tenantId" value={tenant.id} />
                    <input type="hidden" name="userId" value={d.id} />
                    <Input name="password" type="text" placeholder="Nouveau mot de passe (10+ caractères)" autoComplete="off" className="min-h-11 flex-1" />
                  </CreateForm>
                </details>
              </li>
            ))}
          </ul>
          <p className="mt-3 text-xs text-muted-foreground">
            {users.filter((u) => u.role !== "director").length} compte(s) {ROLE_LABELS.waiter.toLowerCase()}/{ROLE_LABELS.cook.toLowerCase()} gérés par le client.
          </p>
        </section>
      </div>

      <section className="mt-6 rounded-card bg-card p-5 shadow-sm">
        <h2 className="text-base font-bold">Journal des actions</h2>
        <ul className="mt-3 divide-y divide-border text-sm">
          {log.map((e) => (
            <li key={e.id} className="flex flex-wrap items-baseline gap-x-3 py-2">
              <time className="w-32 shrink-0 tabular-nums text-xs text-muted-foreground">
                {new Date(e.createdAt).toLocaleString("fr-CH", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" })}
              </time>
              <span className="font-medium">{userName(e.userId)}</span>
              <span className="font-mono text-xs text-muted-foreground">{e.action}</span>
              {e.details && <span className="truncate text-xs text-muted-foreground">{JSON.stringify(e.details)}</span>}
            </li>
          ))}
          {log.length === 0 && <li className="py-2 text-muted-foreground">Aucune action enregistrée.</li>}
        </ul>
      </section>

      <section className="mt-6 rounded-card border border-destructive/30 bg-card p-5">
        <h2 className="text-base font-bold text-destructive">Supprimer définitivement ce client</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Efface toutes les données de l’enseigne (commandes, stock, comptes). À n’utiliser qu’après la demande écrite du client et le délai de 30 jours.
        </p>
        <form action={deleteTenantAction} className="mt-3 flex flex-wrap items-center gap-3">
          <input type="hidden" name="tenantId" value={tenant.id} />
          <Input name="confirm" placeholder={`Tapez ${tenant.slug}`} required className="min-h-12 max-w-64" />
          <ConfirmButton variant="secondary" confirmLabel="Oui, tout effacer">
            Supprimer le client
          </ConfirmButton>
        </form>
      </section>
    </>
  );
}

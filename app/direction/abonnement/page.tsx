import type { Metadata } from "next";
import { Check, ExternalLink } from "lucide-react";
import { PageHeader, Stat } from "@/components/direction/ui";
import { Button } from "@/components/ui/button";
import { openPortalAction, startCheckoutAction } from "@/lib/billing/actions";
import { PLANS, planOf } from "@/lib/billing/plans";
import { stripeConfigured } from "@/lib/billing/stripe";
import { formatMoney } from "@/lib/money";
import { pageDirector } from "@/lib/page-guards";
import { countSitesForTenant } from "@/lib/site-store";
import { isTenantUsable, trialDaysLeft } from "@/lib/tenant-store";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Abonnement" };

const STATUS_LABEL: Record<string, string> = {
  trial: "Essai gratuit",
  active: "Actif",
  past_due: "Paiement en retard",
  canceled: "Résilié",
  suspended: "Suspendu",
};

export default async function AbonnementPage({ searchParams }: { searchParams: Promise<{ succes?: string }> }) {
  const { succes } = await searchParams;
  const { tenant } = await pageDirector({ allowInactiveTenant: true });
  const sites = await countSitesForTenant(tenant.id);
  const configured = stripeConfigured();
  const current = planOf(tenant);
  const days = trialDaysLeft(tenant);
  const subscribed = Boolean(tenant.stripeSubscriptionId) && tenant.status !== "canceled";

  return (
    <>
      <PageHeader title="Abonnement" description="Facturé mensuellement, par établissement actif. Sans engagement : résiliable à tout moment." />

      {succes === "1" && (
        <p className="mb-4 rounded-md bg-success/10 px-4 py-3 text-sm font-semibold text-success">
          Merci ! Votre abonnement est en cours d’activation — cela prend quelques secondes.
        </p>
      )}
      {!isTenantUsable(tenant) && (
        <p className="mb-4 rounded-lg bg-destructive/10 px-4 py-3 text-sm font-semibold text-destructive">
          L’accès de vos équipes est bloqué tant que l’abonnement n’est pas actif.
        </p>
      )}

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label="Statut" value={STATUS_LABEL[tenant.status] ?? tenant.status} hint={days !== null ? `${days} jour${days > 1 ? "s" : ""} d’essai restant${days > 1 ? "s" : ""}` : undefined} tone={isTenantUsable(tenant) ? "accent" : "destructive"} />
        <Stat label="Formule" value={subscribed ? current.name : "—"} />
        <Stat label="Établissements actifs" value={String(sites)} />
        <Stat label="Estimation mensuelle" value={subscribed ? formatMoney(current.pricePerSite * sites, "CHF") : "—"} hint="hors taxes" />
      </div>

      {subscribed && configured && (
        <section className="mt-6 rounded-lg border border-border bg-card p-4">
          <h2 className="text-base font-bold text-foreground">Gérer mon abonnement</h2>
          <p className="mt-1 text-sm text-muted-foreground">Changer de carte, télécharger les factures, modifier ou résilier — via notre partenaire de paiement sécurisé.</p>
          <form action={openPortalAction} className="mt-3">
            <Button type="submit" size="lg">
              Ouvrir l’espace de facturation <ExternalLink className="h-4 w-4" />
            </Button>
          </form>
        </section>
      )}

      <section className="mt-8">
        <h2 className="mb-3 text-[15px] font-semibold tracking-tight text-foreground">{subscribed ? "Changer de formule" : "Choisir une formule"}</h2>
        {!configured && (
          <p className="mb-3 rounded-md border border-warning/30 bg-warning/10 px-3 py-2 text-[13px] text-warning">
            Le paiement en ligne n’est pas encore activé sur cette installation. Contactez-nous pour souscrire.
          </p>
        )}
        <div className="grid gap-3 md:grid-cols-2">
          {PLANS.map((plan) => {
            const isCurrent = subscribed && plan.id === tenant.plan;
            const isPro = plan.id === "pro";
            return (
              <article
                key={plan.id}
                className={cn(
                  "flex flex-col rounded-lg border p-5",
                  isPro ? "border-foreground bg-foreground text-background" : "border-border bg-card text-foreground"
                )}
              >
                <div className="flex items-baseline justify-between">
                  <h3 className="text-[15px] font-semibold">{plan.name}</h3>
                  {isPro && (
                    <span className="rounded-md bg-background/15 px-2 py-0.5 text-[11px] font-medium text-background">Recommandé</span>
                  )}
                </div>
                <p className={cn("mt-0.5 text-[13px]", isPro ? "text-zinc-400" : "text-muted-foreground")}>{plan.tagline}</p>
                <p className="mt-4 font-mono text-3xl font-semibold tracking-tight">
                  {plan.pricePerSite} CHF{" "}
                  <span className={cn("text-[13px] font-medium", isPro ? "text-zinc-400" : "text-muted-foreground")}>/ mois / site</span>
                </p>
                <ul className="mt-4 flex-1 space-y-2 text-[13px]">
                  {plan.features.map((f) => (
                    <li key={f} className="flex items-start gap-2">
                      <Check className={cn("mt-0.5 h-3.5 w-3.5 shrink-0", isPro ? "text-zinc-300" : "text-success")} /> {f}
                    </li>
                  ))}
                </ul>
                <form action={subscribed ? openPortalAction : startCheckoutAction} className="mt-6">
                  {!subscribed && <input type="hidden" name="plan" value={plan.id} />}
                  <Button
                    type="submit"
                    size="md"
                    className={cn(
                      "w-full",
                      isPro
                        ? "bg-background text-foreground hover:bg-zinc-100"
                        : "bg-foreground text-background hover:bg-foreground/90"
                    )}
                    disabled={!configured}
                  >
                    {isCurrent
                      ? "Formule actuelle — gérer"
                      : subscribed
                        ? "Changer dans l’espace de facturation"
                        : `Souscrire à ${plan.name}`}
                  </Button>
                </form>
              </article>
            );
          })}
        </div>
        <p className="mt-4 text-xs text-muted-foreground">
          Prix hors taxes. Paiement sécurisé par Stripe ; nous ne stockons aucune donnée bancaire. Facture disponible chaque mois dans l’espace de facturation.
          {subscribed && " Pour changer de formule sur un abonnement en cours, utilisez l’espace de facturation (prorata automatique)."}
        </p>
      </section>
    </>
  );
}

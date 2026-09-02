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
        <p className="mb-4 rounded-card bg-success/10 px-4 py-3 text-sm font-semibold text-success">
          Merci ! Votre abonnement est en cours d’activation — cela prend quelques secondes.
        </p>
      )}
      {!isTenantUsable(tenant) && (
        <p className="mb-4 rounded-card bg-destructive/10 px-4 py-3 text-sm font-semibold text-destructive">
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
        <section className="mt-6 rounded-card bg-card p-5 shadow-sm">
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
        <h2 className="mb-3 text-lg font-bold text-foreground">{subscribed ? "Changer de formule" : "Choisir une formule"}</h2>
        {!configured && (
          <p className="mb-3 rounded-card bg-warning/10 px-4 py-3 text-sm text-warning">
            Le paiement en ligne n’est pas encore activé sur cette installation. Contactez-nous pour souscrire.
          </p>
        )}
        <div className="grid gap-4 md:grid-cols-2">
          {PLANS.map((plan) => {
            const isCurrent = subscribed && plan.id === tenant.plan;
            return (
              <article key={plan.id} className={cn("flex flex-col rounded-card border-2 bg-card p-6 shadow-sm", plan.id === "pro" ? "border-accent" : "border-transparent")}>
                <div className="flex items-baseline justify-between">
                  <h3 className="text-xl font-bold text-foreground">{plan.name}</h3>
                  {plan.id === "pro" && <span className="rounded-pill bg-accent px-3 py-1 text-xs font-bold text-accent-foreground">Recommandé</span>}
                </div>
                <p className="text-sm text-muted-foreground">{plan.tagline}</p>
                <p className="mt-4 text-3xl font-bold text-foreground">
                  {plan.pricePerSite} CHF <span className="text-base font-medium text-muted-foreground">/ mois / établissement</span>
                </p>
                <ul className="mt-4 flex-1 space-y-2 text-sm">
                  {plan.features.map((f) => (
                    <li key={f} className="flex items-start gap-2">
                      <Check className="mt-0.5 h-4 w-4 shrink-0 text-success" /> {f}
                    </li>
                  ))}
                </ul>
                {/* Plan changes on a live subscription go through the Stripe
                    portal (prorated) rather than a second checkout. */}
                <form action={subscribed ? openPortalAction : startCheckoutAction} className="mt-6">
                  <input type="hidden" name="plan" value={plan.id} />
                  <Button type="submit" size="lg" variant={plan.id === "pro" ? "primary" : "secondary"} className="w-full" disabled={!configured}>
                    {isCurrent ? "Formule actuelle — gérer" : subscribed ? `Passer à ${plan.name}` : `Souscrire à ${plan.name}`}
                  </Button>
                </form>
              </article>
            );
          })}
        </div>
        <p className="mt-4 text-xs text-muted-foreground">
          Prix hors taxes. Paiement sécurisé par Stripe ; nous ne stockons aucune donnée bancaire. Facture disponible chaque mois dans l’espace de facturation.
        </p>
      </section>
    </>
  );
}

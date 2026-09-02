import Link from "next/link";
import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { BarChart3, Check, ChefHat, ClipboardList, Package, Receipt, Store, Users, WifiOff } from "lucide-react";
import { PRODUCT_NAME } from "@/components/brand";
import { PublicShell } from "@/components/marketing/shell";
import { PLANS } from "@/lib/billing/plans";
import { getSession, homePathFor } from "@/lib/session";

export const metadata: Metadata = {
  title: `${PRODUCT_NAME} — Le portail de votre chaîne de crêperies`,
  description: "Commandes, cuisine, caisse, stock et pilotage multi-établissements. Pensé pour vos équipes, sans formation. Essai gratuit 14 jours.",
};

const MODULES = [
  { icon: ClipboardList, title: "Prise de commande", text: "Table ou à emporter, produits en trois tapes, envoi direct en cuisine." },
  { icon: ChefHat, title: "Écran cuisine", text: "File des commandes, temps d’attente, un bouton « Prêt ». Fonctionne même sans wifi." },
  { icon: Receipt, title: "Caisse", text: "Encaissement en un geste, ticket, clôture du jour, export pour la compta." },
  { icon: Package, title: "Stock", text: "Décrément automatique à la commande, alertes de rupture dès l’ouverture." },
  { icon: BarChart3, title: "Pilotage", text: "Chiffre d’affaires du jour au mois, meilleures ventes, comparaison entre établissements." },
  { icon: Users, title: "Équipe", text: "Un compte serveur ou cuisinier en 30 secondes : prénom, rôle, code à 4 chiffres." },
];

export default async function Home() {
  const session = await getSession();
  if (session) redirect(homePathFor(session.user));

  return (
    <PublicShell wide>
      <section className="grid items-center gap-10 py-6 lg:grid-cols-[1.1fr_0.9fr] lg:py-14">
        <div>
          <p className="inline-flex rounded-pill bg-accent/10 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-accent">
            Pour les chaînes de crêperies
          </p>
          <h1 className="mt-4 text-4xl font-bold leading-tight text-foreground sm:text-5xl">
            Toute votre chaîne, une seule tablette par établissement.
          </h1>
          <p className="mt-5 max-w-xl text-lg text-muted-foreground">
            Commandes, cuisine, caisse et stock pour vos équipes ; chiffres et menu pour la direction. Aucune formation :
            un nouveau serveur prend sa première commande seul, en moins d’une minute.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link href="/inscription" className="inline-flex min-h-14 items-center rounded-pill bg-accent px-7 text-base font-semibold text-accent-foreground hover:bg-accent-hover">
              Démarrer l’essai gratuit
            </Link>
            <Link href="/guide" className="inline-flex min-h-14 items-center rounded-pill bg-card px-7 text-base font-semibold text-foreground shadow-sm hover:bg-muted">
              Voir comment ça marche
            </Link>
          </div>
          <p className="mt-4 text-sm text-muted-foreground">14 jours gratuits · Sans carte bancaire · Données hébergées en Europe</p>
        </div>

        <div className="rounded-card bg-sidebar-background p-6 text-sidebar-foreground shadow-xl">
          <p className="text-xs font-semibold uppercase tracking-wide text-sidebar-muted-foreground">Vue direction · aujourd’hui</p>
          <div className="mt-4 grid grid-cols-2 gap-3">
            {[
              ["Chiffre d’affaires", "4 812 CHF"],
              ["Commandes", "213"],
              ["Ticket moyen", "22.60 CHF"],
              ["Ruptures", "2"],
            ].map(([k, v]) => (
              <div key={k} className="rounded-control bg-sidebar-accent/60 p-3">
                <p className="text-xs text-sidebar-muted-foreground">{k}</p>
                <p className="mt-1 text-xl font-bold tabular-nums">{v}</p>
              </div>
            ))}
          </div>
          <div className="mt-4 space-y-2 text-sm">
            {[
              ["Lausanne — Gare", 1980, 100],
              ["Genève — Plainpalais", 1650, 83],
              ["Fribourg — Centre", 1182, 60],
            ].map(([name, ca, pct]) => (
              <div key={String(name)}>
                <div className="flex justify-between">
                  <span>{name}</span>
                  <span className="tabular-nums text-sidebar-muted-foreground">{ca} CHF</span>
                </div>
                <div className="mt-1 h-2 rounded-full bg-sidebar-accent">
                  <div className="h-2 rounded-full bg-accent" style={{ width: `${pct}%` }} />
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="py-10">
        <h2 className="text-2xl font-bold text-foreground">Tout ce dont un point de vente a besoin, rien de plus</h2>
        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {MODULES.map(({ icon: Icon, title, text }) => (
            <div key={title} className="rounded-card bg-card p-5 shadow-sm">
              <span className="inline-flex h-11 w-11 items-center justify-center rounded-control bg-accent/10 text-accent">
                <Icon className="h-5 w-5" />
              </span>
              <h3 className="mt-3 text-base font-bold text-foreground">{title}</h3>
              <p className="mt-1 text-sm text-muted-foreground">{text}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="grid gap-6 rounded-card bg-card p-6 shadow-sm sm:p-8 lg:grid-cols-3">
        <div>
          <WifiOff className="h-6 w-6 text-accent" />
          <h3 className="mt-3 font-bold text-foreground">Le wifi coupe ? La cuisine continue.</h3>
          <p className="mt-1 text-sm text-muted-foreground">Marquer une commande prête ou ajuster un stock fonctionne hors connexion ; tout se synchronise au retour du réseau.</p>
        </div>
        <div>
          <Store className="h-6 w-6 text-accent" />
          <h3 className="mt-3 font-bold text-foreground">Un menu, tous vos établissements.</h3>
          <p className="mt-1 text-sm text-muted-foreground">Changez un prix ou une disponibilité une fois, propagez-le à toute la chaîne — ou seulement à un site.</p>
        </div>
        <div>
          <Users className="h-6 w-6 text-accent" />
          <h3 className="mt-3 font-bold text-foreground">Chacun ne voit que son métier.</h3>
          <p className="mt-1 text-sm text-muted-foreground">Le serveur encaisse, le cuisinier prépare, la direction pilote. Les marges et les données RH restent en direction.</p>
        </div>
      </section>

      <section id="tarifs" className="py-14">
        <h2 className="text-center text-2xl font-bold text-foreground">Un prix par établissement, sans engagement</h2>
        <p className="mt-2 text-center text-sm text-muted-foreground">Facturation mensuelle, résiliable à tout moment. 14 jours d’essai avec toutes les fonctions.</p>
        <div className="mx-auto mt-8 grid max-w-3xl gap-5 md:grid-cols-2">
          {PLANS.map((plan) => (
            <div key={plan.id} className={`rounded-card p-6 shadow-sm ${plan.id === "pro" ? "bg-sidebar-background text-sidebar-foreground" : "bg-card text-foreground"}`}>
              <h3 className="text-lg font-bold">{plan.name}</h3>
              <p className={`text-sm ${plan.id === "pro" ? "text-sidebar-muted-foreground" : "text-muted-foreground"}`}>{plan.tagline}</p>
              <p className="mt-4 text-4xl font-bold">
                {plan.pricePerSite} <span className="text-base font-medium">CHF / mois / établissement</span>
              </p>
              <ul className="mt-5 space-y-2 text-sm">
                {plan.features.map((f) => (
                  <li key={f} className="flex gap-2">
                    <Check className="mt-0.5 h-4 w-4 shrink-0 text-accent" /> {f}
                  </li>
                ))}
              </ul>
              <Link
                href="/inscription"
                className={`mt-6 inline-flex min-h-12 w-full items-center justify-center rounded-pill px-5 text-sm font-semibold ${
                  plan.id === "pro" ? "bg-accent text-accent-foreground hover:bg-accent-hover" : "bg-muted text-foreground hover:bg-border/60"
                }`}
              >
                Essayer {plan.name}
              </Link>
            </div>
          ))}
        </div>
      </section>
    </PublicShell>
  );
}

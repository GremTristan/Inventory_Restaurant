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
      <section className="grid items-center gap-10 py-8 lg:grid-cols-[1.15fr_0.85fr] lg:py-16">
        <div>
          <p className="inline-flex items-center rounded-md border border-border bg-card px-2.5 py-1 font-mono text-[11px] font-medium uppercase tracking-[0.06em] text-muted-foreground">
            Chaînes de crêperies
          </p>
          <h1 className="mt-5 text-4xl font-semibold tracking-tight text-foreground sm:text-5xl sm:leading-[1.08]">
            Toute votre chaîne, une seule tablette par établissement.
          </h1>
          <p className="mt-5 max-w-xl text-[16px] leading-relaxed text-muted-foreground">
            Commandes, cuisine, caisse et stock pour vos équipes ; chiffres et menu pour la direction. Aucune formation :
            un nouveau serveur prend sa première commande seul, en moins d’une minute.
          </p>
          <div className="mt-8 flex flex-wrap gap-2.5">
            <Link href="/inscription" className="inline-flex h-10 items-center rounded-md bg-foreground px-5 text-[13px] font-medium text-background hover:bg-foreground/90">
              Démarrer l’essai gratuit
            </Link>
            <Link href="/guide" className="inline-flex h-10 items-center rounded-md border border-border bg-card px-5 text-[13px] font-medium text-foreground hover:bg-muted">
              Voir comment ça marche
            </Link>
          </div>
          <p className="mt-4 text-[13px] text-muted-foreground">14 jours gratuits · Sans carte bancaire · Données hébergées en Europe</p>
        </div>

        <div className="rounded-lg border border-border bg-card shadow-sm">
          <div className="flex items-center justify-between border-b border-border px-4 py-3">
            <p className="text-[12px] font-medium text-muted-foreground">Overview · today</p>
            <span className="rounded-md bg-muted px-2 py-0.5 font-mono text-[10px] text-muted-foreground">LIVE</span>
          </div>
          <div className="grid grid-cols-2 gap-px border-b border-border bg-border">
            {[
              ["Revenue", "4 812 CHF"],
              ["Orders", "213"],
              ["Avg ticket", "22.60 CHF"],
              ["Stockouts", "2"],
            ].map(([k, v]) => (
              <div key={k} className="bg-card px-4 py-3.5">
                <p className="text-[11px] font-medium uppercase tracking-[0.04em] text-muted-foreground">{k}</p>
                <p className="mt-1.5 font-mono text-[20px] font-semibold tracking-tight tabular-nums text-foreground">{v}</p>
              </div>
            ))}
          </div>
          <div className="space-y-3 p-4">
            {[
              ["Lausanne — Gare", 1980, 100],
              ["Genève — Plainpalais", 1650, 83],
              ["Fribourg — Centre", 1182, 60],
            ].map(([name, ca, pct]) => (
              <div key={String(name)}>
                <div className="flex justify-between text-[13px]">
                  <span className="font-medium text-foreground">{name}</span>
                  <span className="font-mono tabular-nums text-muted-foreground">{ca} CHF</span>
                </div>
                <div className="mt-1.5 h-1 rounded-sm bg-muted">
                  <div className="h-1 rounded-sm bg-foreground" style={{ width: `${pct}%` }} />
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="border-t border-border py-12">
        <h2 className="text-2xl font-semibold tracking-tight text-foreground">Tout ce dont un point de vente a besoin</h2>
        <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {MODULES.map(({ icon: Icon, title, text }) => (
            <div key={title} className="rounded-lg border border-border bg-card p-4">
              <span className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-border bg-muted text-foreground">
                <Icon className="h-4 w-4 stroke-[1.6]" />
              </span>
              <h3 className="mt-3 text-[14px] font-semibold tracking-tight text-foreground">{title}</h3>
              <p className="mt-1 text-[13px] leading-relaxed text-muted-foreground">{text}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="grid gap-6 rounded-lg border border-border bg-card p-6 sm:p-8 lg:grid-cols-3">
        <div>
          <WifiOff className="h-5 w-5 text-foreground" />
          <h3 className="mt-3 text-[14px] font-semibold text-foreground">Le wifi coupe ? La cuisine continue.</h3>
          <p className="mt-1 text-[13px] leading-relaxed text-muted-foreground">Marquer une commande prête ou ajuster un stock fonctionne hors connexion ; tout se synchronise au retour du réseau.</p>
        </div>
        <div>
          <Store className="h-5 w-5 text-foreground" />
          <h3 className="mt-3 text-[14px] font-semibold text-foreground">Un menu, tous vos établissements.</h3>
          <p className="mt-1 text-[13px] leading-relaxed text-muted-foreground">Changez un prix ou une disponibilité une fois, propagez-le à toute la chaîne — ou seulement à un site.</p>
        </div>
        <div>
          <Users className="h-5 w-5 text-foreground" />
          <h3 className="mt-3 text-[14px] font-semibold text-foreground">Chacun ne voit que son métier.</h3>
          <p className="mt-1 text-[13px] leading-relaxed text-muted-foreground">Le serveur encaisse, le cuisinier prépare, la direction pilote. Les marges et les données RH restent en direction.</p>
        </div>
      </section>

      <section id="tarifs" className="border-t border-border py-14">
        <h2 className="text-center text-2xl font-semibold tracking-tight text-foreground">Un prix par établissement, sans engagement</h2>
        <p className="mt-2 text-center text-[13px] text-muted-foreground">Facturation mensuelle, résiliable à tout moment. 14 jours d’essai avec toutes les fonctions.</p>
        <div className="mx-auto mt-8 grid max-w-3xl gap-4 md:grid-cols-2">
          {PLANS.map((plan) => (
            <div
              key={plan.id}
              className={`rounded-lg border p-5 ${
                plan.id === "pro" ? "border-foreground bg-foreground text-background" : "border-border bg-card text-foreground"
              }`}
            >
              <h3 className="text-[15px] font-semibold">{plan.name}</h3>
              <p className={`mt-0.5 text-[13px] ${plan.id === "pro" ? "text-zinc-400" : "text-muted-foreground"}`}>{plan.tagline}</p>
              <p className="mt-4 font-mono text-3xl font-semibold tracking-tight">
                {plan.pricePerSite} <span className="text-[13px] font-medium opacity-70">CHF / mois / site</span>
              </p>
              <ul className="mt-5 space-y-2 text-[13px]">
                {plan.features.map((f) => (
                  <li key={f} className="flex gap-2">
                    <Check className={`mt-0.5 h-3.5 w-3.5 shrink-0 ${plan.id === "pro" ? "text-zinc-300" : "text-accent"}`} /> {f}
                  </li>
                ))}
              </ul>
              <Link
                href="/inscription"
                className={`mt-6 inline-flex h-9 w-full items-center justify-center rounded-md text-[13px] font-medium ${
                  plan.id === "pro" ? "bg-background text-foreground hover:bg-zinc-100" : "bg-foreground text-background hover:bg-foreground/90"
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

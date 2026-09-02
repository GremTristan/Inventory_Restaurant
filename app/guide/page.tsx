import Link from "next/link";
import type { Metadata } from "next";
import { PRODUCT_NAME } from "@/components/brand";
import { PublicShell } from "@/components/marketing/shell";

export const metadata: Metadata = { title: "Guide de démarrage — 10 minutes" };

const STEPS = [
  {
    title: "Créez votre compte",
    time: "1 min",
    text: "Nom de l’enseigne, votre premier établissement, votre e-mail et un mot de passe. Un menu de démarrage (galettes, crêpes, boissons) est déjà en place : modifiez-le, ne partez pas de zéro.",
  },
  {
    title: "Ajoutez vos établissements",
    time: "2 min",
    text: "Direction → Établissements → « Ajouter ». Chaque établissement reçoit un code tablette à 6 caractères. Notez-le : c’est lui qui relie une tablette à un point de vente.",
  },
  {
    title: "Créez votre équipe",
    time: "3 min",
    text: "Direction → Équipe : prénom, rôle (serveur ou cuisinier), code à 4 chiffres. C’est tout. Donnez le code à la personne ; elle le tape sur la tablette pour se connecter.",
  },
  {
    title: "Reliez les tablettes",
    time: "2 min",
    text: "Sur chaque tablette, ouvrez la page de connexion et saisissez le code tablette de l’établissement. Une seule fois : ensuite la tablette affiche directement les prénoms de l’équipe. Ajoutez la page à l’écran d’accueil (« Ajouter à l’écran d’accueil ») pour un usage plein écran.",
  },
  {
    title: "Ajustez le menu et le stock",
    time: "2 min",
    text: "Direction → Menu : prix, disponibilité, propagation à tous les établissements. Direction → Stock : ingrédients et seuils d’alerte. Reliez les ingrédients à vos produits pour que le stock se décrémente tout seul à chaque commande.",
  },
];

export default function GuidePage() {
  return (
    <PublicShell>
      <h1 className="text-3xl font-bold text-foreground">Démarrer en 10 minutes</h1>
      <p className="mt-2 text-muted-foreground">
        De l’inscription à la première commande, sans intervention de notre part.
      </p>

      <ol className="mt-8 space-y-4">
        {STEPS.map((step, i) => (
          <li key={step.title} className="flex gap-4 rounded-lg border border-border bg-card p-4">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-accent text-base font-bold text-accent-foreground">{i + 1}</span>
            <div>
              <div className="flex flex-wrap items-baseline gap-x-3">
                <h2 className="text-base font-bold text-foreground">{step.title}</h2>
                <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{step.time}</span>
              </div>
              <p className="mt-1 text-sm text-muted-foreground">{step.text}</p>
            </div>
          </li>
        ))}
      </ol>

      <section className="mt-12">
        <h2 className="text-xl font-bold text-foreground">Au quotidien</h2>
        <div className="mt-4 grid gap-4 sm:grid-cols-3">
          <div className="rounded-lg border border-border bg-card p-4">
            <h3 className="font-bold text-foreground">Serveur</h3>
            <ol className="mt-2 list-decimal space-y-1 pl-5 text-sm text-muted-foreground">
              <li>Prénom → code à 4 chiffres</li>
              <li>« Nouvelle commande » → table ou à emporter</li>
              <li>Tapez les produits → « Envoyer en cuisine »</li>
              <li>Quand la cuisine a fini : « Servi »</li>
              <li>Caisse → commande → mode de paiement → « Encaisser »</li>
            </ol>
          </div>
          <div className="rounded-lg border border-border bg-card p-4">
            <h3 className="font-bold text-foreground">Cuisinier</h3>
            <ol className="mt-2 list-decimal space-y-1 pl-5 text-sm text-muted-foreground">
              <li>Prénom → code à 4 chiffres</li>
              <li>Les commandes arrivent dans l’ordre, avec le temps d’attente</li>
              <li>Un bouton : « Prêt »</li>
              <li>Onglet Stock : alertes rouges en haut, comptage avec + / −</li>
            </ol>
          </div>
          <div className="rounded-lg border border-border bg-card p-4">
            <h3 className="font-bold text-foreground">Direction</h3>
            <ol className="mt-2 list-decimal space-y-1 pl-5 text-sm text-muted-foreground">
              <li>Tableau de bord : CA du jour, ruptures, top produits</li>
              <li>Ventes : jour / semaine / mois, par établissement, export</li>
              <li>Menu : disponibilité en un tap, prix, propagation</li>
              <li>Équipe : compte en 30 secondes, désactivation immédiate</li>
            </ol>
          </div>
        </div>
      </section>

      <section className="mt-12 rounded-md bg-accent/10 p-6">
        <h2 className="text-lg font-bold text-foreground">Le wifi coupe en cuisine ?</h2>
        <p className="mt-2 text-sm text-foreground">
          L’écran cuisine et le stock continuent de fonctionner : « Prêt » et les ajustements de stock sont enregistrés sur la tablette et envoyés
          automatiquement dès que le réseau revient. Un bandeau « Hors ligne » et le nombre d’actions en attente restent visibles ; ne fermez pas
          l’application avant qu’il disparaisse.
        </p>
      </section>

      <p className="mt-10 text-sm text-muted-foreground">
        Une question ? Écrivez-nous depuis votre espace Direction → Abonnement, ou{" "}
        <Link href="/inscription" className="text-accent underline">
          démarrez votre essai {PRODUCT_NAME}
        </Link>
        .
      </p>
    </PublicShell>
  );
}

import type { Metadata } from "next";
import { PRODUCT_NAME } from "@/components/brand";
import { Prose, PublicShell } from "@/components/marketing/shell";
import { PLANS } from "@/lib/billing/plans";
import { EDITOR, LEGAL_UPDATED } from "@/lib/editor";

export const metadata: Metadata = { title: "Conditions générales d’utilisation et de vente" };

export default function CguPage() {
  return (
    <PublicShell>
      <Prose title="Conditions générales d’utilisation et de vente" updated={LEGAL_UPDATED}>
        <h2>1. Objet</h2>
        <p>
          Les présentes conditions régissent l’accès et l’utilisation du service {PRODUCT_NAME} (le « Service »), une
          application en ligne de gestion de commandes, de cuisine, de caisse, de stock et de pilotage destinée aux
          établissements de restauration, fournie par {EDITOR.name} (l’« Éditeur ») au client professionnel (le
          « Client »). L’inscription vaut acceptation sans réserve des présentes.
        </p>

        <h2>2. Compte et accès</h2>
        <ul>
          <li>Le Client crée un compte « Direction » au nom de son enseigne ; il est responsable des comptes serveur et cuisinier qu’il crée et des codes qu’il leur remet.</li>
          <li>Le Client garantit l’exactitude des informations fournies et la confidentialité de ses identifiants.</li>
          <li>Le Service est réservé à un usage professionnel ; toute revente ou mise à disposition à des tiers est interdite.</li>
        </ul>

        <h2>3. Essai gratuit</h2>
        <p>
          Tout nouveau compte bénéficie de 14 jours d’essai avec l’ensemble des fonctions, sans moyen de paiement. À
          l’issue de l’essai, l’accès des tablettes est suspendu jusqu’à la souscription d’un abonnement ; les données
          sont conservées 30 jours puis supprimées à défaut de souscription.
        </p>

        <h2>4. Abonnement et prix</h2>
        <ul>
          {PLANS.map((p) => (
            <li key={p.id}>
              <strong>{p.name}</strong> : {p.pricePerSite} CHF hors taxes par mois et par établissement actif.
            </li>
          ))}
        </ul>
        <p>
          L’abonnement est mensuel, sans engagement de durée, facturé d’avance au nombre d’établissements actifs.
          L’ajout d’un établissement en cours de mois est facturé au prorata. Le paiement est traité par Stripe ;
          l’Éditeur ne stocke aucune donnée de carte. Les prix peuvent être révisés avec un préavis de 30 jours notifié
          par e-mail.
        </p>

        <h2>5. Défaut de paiement</h2>
        <p>
          En cas d’échec de paiement, le Service reste accessible pendant la période de relance (jusqu’à 14 jours). Au
          terme de celle-ci, l’accès des tablettes est suspendu ; l’espace Direction reste accessible pour régulariser ou
          exporter les données.
        </p>

        <h2>6. Résiliation</h2>
        <p>
          Le Client peut résilier à tout moment depuis Direction → Abonnement. La résiliation prend effet à la fin de la
          période payée. Le Client peut exporter l’intégralité de ses données avant et après la résiliation pendant 30
          jours ; elles sont ensuite supprimées définitivement, à l’exception des pièces comptables que l’Éditeur doit
          conserver légalement.
        </p>

        <h2>7. Disponibilité et hors-ligne</h2>
        <p>
          L’Éditeur s’efforce d’assurer une disponibilité continue du Service et effectue les opérations de maintenance
          en dehors des heures de service habituelles. Les fonctions critiques de cuisine (marquer une commande prête,
          ajuster un stock) fonctionnent sans connexion et se synchronisent au retour du réseau. Le Client reste
          responsable de la qualité de sa connexion et de ses équipements.
        </p>

        <h2>8. Données</h2>
        <p>
          Les données saisies restent la propriété du Client. L’Éditeur agit en qualité de sous-traitant pour les données
          personnelles des employés du Client (prénom, rôle) conformément à la{" "}
          <a href="/confidentialite">politique de confidentialité</a>, qui fait partie intégrante des présentes.
        </p>

        <h2>9. Responsabilité</h2>
        <p>
          Le Service est un outil d’aide à l’exploitation. L’Éditeur n’est pas responsable des erreurs de saisie, de la
          conformité fiscale des tickets, ni des pertes indirectes. La responsabilité totale de l’Éditeur est limitée au
          montant des abonnements payés au cours des 12 derniers mois.
        </p>

        <h2>10. Droit applicable</h2>
        <p>
          Les présentes sont soumises au droit de : {EDITOR.country}. Tout litige relève des tribunaux du siège de
          l’Éditeur, après tentative de résolution amiable.
        </p>

        <p>
          Contact : <a href={`mailto:${EDITOR.email}`}>{EDITOR.email}</a>
        </p>
      </Prose>
    </PublicShell>
  );
}

import type { Metadata } from "next";
import { PRODUCT_NAME } from "@/components/brand";
import { Prose, PublicShell } from "@/components/marketing/shell";
import { EDITOR, LEGAL_UPDATED } from "@/lib/editor";

export const metadata: Metadata = { title: "Politique de confidentialité" };

export default function ConfidentialitePage() {
  return (
    <PublicShell>
      <Prose title="Politique de confidentialité" updated={LEGAL_UPDATED}>
        <p>
          Cette politique décrit les données personnelles traitées par {PRODUCT_NAME}, pourquoi, combien de temps, et
          vos droits. Elle s’applique au RGPD (UE) et à la LPD (Suisse).
        </p>

        <h2>Responsable et sous-traitant</h2>
        <p>
          <strong>{EDITOR.name}</strong> ({EDITOR.address}) est <em>responsable du traitement</em> pour les données de
          compte des clients (directeurs) et <em>sous-traitant</em> pour les données que le client saisit sur ses
          employés. Contact : <a href={`mailto:${EDITOR.email}`}>{EDITOR.email}</a>.
        </p>

        <h2>Données traitées</h2>
        <ul>
          <li>
            <strong>Compte direction</strong> : nom, e-mail, mot de passe (haché, jamais lisible), enseigne, adresse de
            facturation.
          </li>
          <li>
            <strong>Employés (serveurs, cuisiniers)</strong> : prénom ou nom d’usage, rôle, établissement, code PIN
            (haché). Aucune donnée RH (salaire, adresse, horaires) n’est collectée.
          </li>
          <li>
            <strong>Exploitation</strong> : commandes, tickets, stock, journal des actions (qui a fait quoi, quand) — ces
            données sont celles de l’établissement, pas des consommateurs finaux : aucune donnée client final n’est
            saisie.
          </li>
          <li>
            <strong>Facturation</strong> : traitée par Stripe ; nous ne conservons que l’identifiant client Stripe et
            l’état de l’abonnement.
          </li>
          <li>
            <strong>Technique</strong> : cookies de session strictement nécessaires (connexion, tablette reliée). Aucun
            cookie publicitaire, aucun traceur tiers.
          </li>
        </ul>

        <h2>Finalités et bases légales</h2>
        <ul>
          <li>Fourniture du service et exécution du contrat (art. 6.1.b RGPD).</li>
          <li>Facturation et obligations comptables (art. 6.1.c).</li>
          <li>Sécurité, prévention de la fraude, journal d’audit (intérêt légitime, art. 6.1.f).</li>
        </ul>

        <h2>Hébergement et transferts</h2>
        <p>
          {EDITOR.hosting}. Les données sont stockées dans l’Union européenne. Stripe (paiements) peut traiter des données
          aux États-Unis sous les clauses contractuelles types de la Commission européenne.
        </p>

        <h2>Durées de conservation</h2>
        <ul>
          <li>Données du compte et d’exploitation : pendant l’abonnement, puis 30 jours après résiliation.</li>
          <li>Pièces de facturation : 10 ans (obligation légale).</li>
          <li>Journal d’audit : 12 mois glissants.</li>
          <li>Comptes employés supprimés par le client : effacement immédiat.</li>
        </ul>

        <h2>Sécurité</h2>
        <ul>
          <li>Chiffrement en transit (TLS) et au repos (chiffrement disque de l’hébergeur).</li>
          <li>Mots de passe et codes PIN hachés (bcrypt) ; verrouillage temporaire après plusieurs échecs.</li>
          <li>Isolation stricte des données de chaque enseigne ; permissions vérifiées côté serveur à chaque action.</li>
          <li>Journal d’audit des actions sensibles (comptes, prix, suppressions).</li>
        </ul>

        <h2>Vos droits</h2>
        <p>
          Accès, rectification, effacement, portabilité, limitation et opposition. Les directeurs exercent ces droits
          directement : <strong>Direction → Réglages → Vos données</strong> permet d’exporter toutes les données de
          l’enseigne en un clic et de demander la suppression du compte. Les employés s’adressent à leur employeur (le
          client), qui peut modifier ou supprimer leur compte instantanément. Pour toute autre demande :{" "}
          <a href={`mailto:${EDITOR.email}`}>{EDITOR.email}</a> — réponse sous 30 jours. Vous pouvez également saisir
          l’autorité de contrôle compétente (PFPDT en Suisse, CNIL en France).
        </p>

        <h2>Modifications</h2>
        <p>Toute modification substantielle est notifiée par e-mail aux directeurs 30 jours avant son entrée en vigueur.</p>
      </Prose>
    </PublicShell>
  );
}

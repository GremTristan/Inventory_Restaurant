import type { Metadata } from "next";
import { PRODUCT_NAME } from "@/components/brand";
import { Prose, PublicShell } from "@/components/marketing/shell";
import { EDITOR, LEGAL_UPDATED } from "@/lib/editor";

export const metadata: Metadata = { title: "Mentions légales" };

export default function MentionsLegalesPage() {
  return (
    <PublicShell>
      <Prose title="Mentions légales" updated={LEGAL_UPDATED}>
        <h2>Éditeur du service</h2>
        <p>
          Le service {PRODUCT_NAME} est édité par <strong>{EDITOR.name}</strong>, {EDITOR.address}, {EDITOR.country}.
          <br />
          Numéro d’identification : {EDITOR.registration}.
          <br />
          Contact : <a href={`mailto:${EDITOR.email}`}>{EDITOR.email}</a>.
        </p>

        <h2>Hébergement</h2>
        <p>{EDITOR.hosting}. Les données des clients sont stockées et traitées dans l’Union européenne.</p>

        <h2>Propriété intellectuelle</h2>
        <p>
          Le logiciel, son interface, ses textes et sa marque sont la propriété exclusive de l’éditeur. Les logos, noms
          d’enseigne et contenus saisis par les clients (menus, prix, données de vente) restent leur propriété ; ils
          sont hébergés pour la seule finalité d’exécution du service.
        </p>

        <h2>Responsabilité</h2>
        <p>
          {PRODUCT_NAME} est un outil d’aide à l’exploitation. Les tickets émis ne constituent pas des justificatifs
          fiscaux certifiés sauf paramétrage et obligations propres au pays du client ; celui-ci reste responsable de la
          conformité de sa caisse et de sa comptabilité vis-à-vis des autorités compétentes.
        </p>

        <h2>Signalement</h2>
        <p>
          Pour toute question, réclamation ou signalement de faille de sécurité :{" "}
          <a href={`mailto:${EDITOR.email}`}>{EDITOR.email}</a>.
        </p>
      </Prose>
    </PublicShell>
  );
}

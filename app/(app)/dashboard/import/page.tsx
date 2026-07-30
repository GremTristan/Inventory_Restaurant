import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/session";
import { sites } from "@/data/sites";
import { DataImportForm } from "@/components/data-import-form";
import { Section } from "@/components/ui/section";

export default async function ImportPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (user.role !== "director") redirect(`/inventory/${user.siteId}`);

  const aiConfigured = Boolean(process.env.OLLAMA_API_KEY);

  return (
    <>
      <h1 className="text-2xl font-bold text-foreground sm:text-3xl">Import de données</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Importez un historique de ventes ou un inventaire depuis un fichier, une photo, ou décrivez-les en
        texte libre — l&apos;assistant IA identifie automatiquement de quoi il s&apos;agit et l&apos;enregistre.
      </p>

      <div className="mt-6">
        {aiConfigured ? (
          <Section
            title="Nouvel import"
            description="Un fichier CSV/Excel, une photo, du texte — ou toute combinaison des trois."
          >
            <DataImportForm sites={sites} defaultSiteId={sites[0].id} />
          </Section>
        ) : (
          <Section title="Nouvel import" description="Fonctionnalité indisponible.">
            <p className="text-sm text-muted-foreground">
              Connectez une clé API (OLLAMA_API_KEY) pour activer l&apos;import de données assisté par IA.
            </p>
          </Section>
        )}
      </div>
    </>
  );
}

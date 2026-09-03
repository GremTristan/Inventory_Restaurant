import Link from "next/link";
import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { BrandMark } from "@/components/brand";
import { SignupForm } from "@/components/auth/forms";
import { Card } from "@/components/ui/card";
import { getSession, homePathFor } from "@/lib/session";

export const metadata: Metadata = { title: "Créer mon espace" };

export default async function InscriptionPage() {
  const session = await getSession();
  if (session) redirect(homePathFor(session.user));

  return (
    <main className="flex min-h-screen flex-col items-center bg-muted/40 px-4 py-8">
      <div className="mb-8 w-full max-w-xl">
        <BrandMark />
      </div>
      <Card className="w-full max-w-xl p-6 sm:p-8">
        <h1 className="text-2xl font-bold text-foreground">Votre crêperie en ligne en 3 minutes</h1>
        <p className="mb-6 mt-2 text-sm text-muted-foreground">
          14 jours d’essai, sans carte bancaire. Vous ajouterez vos autres établissements et votre équipe ensuite.
        </p>
        <SignupForm />
      </Card>
      <p className="mt-6 text-sm text-muted-foreground">
        Déjà client ?{" "}
        <Link href="/connexion" className="font-semibold text-accent hover:underline">
          Se connecter
        </Link>
      </p>
    </main>
  );
}

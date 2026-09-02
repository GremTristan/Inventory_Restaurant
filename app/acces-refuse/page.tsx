import Link from "next/link";
import { ShieldAlert } from "lucide-react";
import { getSession, homePathFor } from "@/lib/session";
import { logoutAction } from "@/lib/auth/actions";
import { Button, buttonClassName } from "@/components/ui/button";

export default async function AccesRefusePage({ searchParams }: { searchParams: Promise<{ raison?: string }> }) {
  const { raison } = await searchParams;
  const session = await getSession();
  const home = session ? homePathFor(session.user) : "/connexion";

  if (raison === "abonnement") {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center gap-6 px-4 text-center">
        <span className="flex h-16 w-16 items-center justify-center rounded-full bg-warning/10 text-warning">
          <ShieldAlert className="h-8 w-8" />
        </span>
        <div>
          <h1 className="text-2xl font-bold text-foreground">Abonnement en pause</h1>
          <p className="mt-2 max-w-md text-muted-foreground">
            L’accès de votre établissement est suspendu. Votre direction peut le réactiver depuis son espace.
          </p>
        </div>
        {session && (
          <form action={logoutAction}>
            <Button type="submit" variant="secondary" size="lg">
              Changer d’utilisateur
            </Button>
          </form>
        )}
      </main>
    );
  }
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-6 px-4 text-center">
      <span className="flex h-16 w-16 items-center justify-center rounded-full bg-destructive/10 text-destructive">
        <ShieldAlert className="h-8 w-8" />
      </span>
      <div>
        <h1 className="text-2xl font-bold text-foreground">Cette page n’est pas pour vous</h1>
        <p className="mt-2 max-w-md text-muted-foreground">
          Votre rôle ne permet pas d’accéder à cet écran. Si vous pensez que c’est une erreur, parlez-en à votre
          direction.
        </p>
      </div>
      <div className="flex flex-wrap justify-center gap-3">
        <Link href={home} className={buttonClassName({ size: "lg" })}>
          Retour à mon écran
        </Link>
        {session && (
          <form action={logoutAction}>
            <Button type="submit" variant="secondary" size="lg">
              Changer d’utilisateur
            </Button>
          </form>
        )}
      </div>
    </main>
  );
}

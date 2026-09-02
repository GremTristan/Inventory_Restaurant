import { CloudOff } from "lucide-react";

// Served by the service worker when a navigation fails with no network.
export default function HorsLignePage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-4 px-4 text-center">
      <span className="flex h-16 w-16 items-center justify-center rounded-full bg-warning/10 text-warning">
        <CloudOff className="h-8 w-8" />
      </span>
      <h1 className="text-2xl font-bold text-foreground">Pas de réseau pour le moment</h1>
      <p className="max-w-md text-muted-foreground">
        Cette page n’est pas disponible hors ligne. Les écrans Cuisine et Commande déjà ouverts continuent de
        fonctionner et se synchroniseront au retour du Wi-Fi.
      </p>
      <a
        href="/connexion"
        className="mt-2 inline-flex min-h-12 items-center rounded-pill bg-accent px-6 text-base font-semibold text-accent-foreground"
      >
        Réessayer
      </a>
    </main>
  );
}

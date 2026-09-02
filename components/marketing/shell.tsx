import Link from "next/link";
import { BrandMark, PRODUCT_NAME } from "@/components/brand";
import { EDITOR } from "@/lib/editor";

export function PublicShell({ children, wide = false }: { children: React.ReactNode; wide?: boolean }) {
  return (
    <div className="flex min-h-screen flex-col bg-background">
      <header className="border-b border-border/60 bg-card/80 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3 sm:px-6">
          <BrandMark />
          <nav className="flex items-center gap-2 text-sm font-semibold">
            <Link href="/guide" className="hidden min-h-11 items-center rounded-pill px-3 text-muted-foreground hover:text-foreground sm:inline-flex">
              Guide
            </Link>
            <Link href="/connexion" className="inline-flex min-h-11 items-center rounded-pill px-4 text-foreground hover:bg-muted">
              Connexion
            </Link>
            <Link href="/inscription" className="inline-flex min-h-11 items-center rounded-pill bg-accent px-5 text-accent-foreground hover:bg-accent-hover">
              Essai gratuit
            </Link>
          </nav>
        </div>
      </header>
      <main className={`mx-auto w-full flex-1 px-4 py-10 sm:px-6 ${wide ? "max-w-6xl" : "max-w-3xl"}`}>{children}</main>
      <footer className="border-t border-border/60 py-8 text-sm text-muted-foreground">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4 px-4 sm:px-6">
          <p>
            {PRODUCT_NAME} · {EDITOR.name}
          </p>
          <nav className="flex flex-wrap gap-x-5 gap-y-2">
            <Link href="/guide" className="hover:text-foreground">
              Guide de démarrage
            </Link>
            <Link href="/mentions-legales" className="hover:text-foreground">
              Mentions légales
            </Link>
            <Link href="/cgu" className="hover:text-foreground">
              CGU / CGV
            </Link>
            <Link href="/confidentialite" className="hover:text-foreground">
              Confidentialité
            </Link>
          </nav>
        </div>
      </footer>
    </div>
  );
}

// Long-form legal/guide text: readable measure, generous spacing.
export function Prose({ title, updated, children }: { title: string; updated?: string; children: React.ReactNode }) {
  return (
    <article className="prose-custom">
      <h1 className="text-3xl font-bold text-foreground">{title}</h1>
      {updated && <p className="mt-1 text-sm text-muted-foreground">Dernière mise à jour : {updated}</p>}
      <div className="mt-8 space-y-6 text-[15px] leading-relaxed text-foreground [&_h2]:mt-10 [&_h2]:text-xl [&_h2]:font-bold [&_h3]:mt-6 [&_h3]:text-base [&_h3]:font-bold [&_ul]:list-disc [&_ul]:space-y-1 [&_ul]:pl-6 [&_ol]:list-decimal [&_ol]:space-y-1 [&_ol]:pl-6 [&_a]:text-accent [&_a]:underline">
        {children}
      </div>
    </article>
  );
}

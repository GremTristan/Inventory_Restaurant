import Link from "next/link";
import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { BrandMark, BrandScope } from "@/components/brand";
import { BindDeviceForm, PasswordLoginForm } from "@/components/auth/forms";
import { PinLogin } from "@/components/auth/pin-login";
import { Card } from "@/components/ui/card";
import { unbindDeviceAction } from "@/lib/auth/actions";
import { getDeviceSite, getSession, homePathFor } from "@/lib/session";
import { getTenantById } from "@/lib/tenant-store";
import { getActiveStaffForSite } from "@/lib/user-store";

export const metadata: Metadata = { title: "Connexion" };

export default async function ConnexionPage({
  searchParams,
}: {
  searchParams: Promise<{ suite?: string; direction?: string }>;
}) {
  const session = await getSession();
  if (session) redirect(homePathFor(session.user));

  const { suite, direction } = await searchParams;
  const deviceSite = await getDeviceSite();
  const tenant = deviceSite ? ((await getTenantById(deviceSite.tenantId)) ?? null) : null;

  // A tablet bound to a site shows the PIN pad straight away.
  if (deviceSite && direction !== "1") {
    const staff = await getActiveStaffForSite(deviceSite.id);
    return (
      <BrandScope tenant={tenant}>
        <main className="flex min-h-screen flex-col items-center bg-muted/40 px-4 py-8">
          <div className="mb-6 flex w-full max-w-lg items-center justify-between">
            <BrandMark tenant={tenant} href="/connexion" />
            <span className="rounded-md bg-card px-3 py-1.5 text-sm font-semibold text-foreground shadow-sm">
              {deviceSite.name}
            </span>
          </div>
          <Card className="w-full max-w-lg p-6 sm:p-8">
            <PinLogin staff={staff} />
          </Card>
          <div className="mt-6 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-sm">
            <Link href="/connexion?direction=1" className="min-h-11 inline-flex items-center text-accent hover:underline">
              Accès direction
            </Link>
            <form action={unbindDeviceAction}>
              <button type="submit" className="min-h-11 text-muted-foreground hover:underline">
                Changer d’établissement
              </button>
            </form>
          </div>
        </main>
      </BrandScope>
    );
  }

  return (
    <BrandScope tenant={tenant}>
      <main className="flex min-h-screen flex-col items-center bg-background px-4 py-10">
        <div className="mb-8 w-full max-w-3xl">
          <BrandMark tenant={tenant} />
        </div>
        <div className="grid w-full max-w-3xl gap-4 md:grid-cols-2">
          <Card className="p-5 sm:p-6">
            <h1 className="text-[15px] font-semibold tracking-tight text-foreground">Direction</h1>
            <p className="mb-4 mt-1 text-[13px] text-muted-foreground">Gérant, directeur : e-mail et mot de passe.</p>
            <PasswordLoginForm next={suite} />
            <p className="mt-4 text-center text-[13px] text-muted-foreground">
              Pas encore de compte ?{" "}
              <Link href="/inscription" className="font-medium text-foreground underline-offset-2 hover:underline">
                Essai gratuit 14 jours
              </Link>
            </p>
          </Card>
          {deviceSite ? (
            <Card className="p-5 sm:p-6">
              <h2 className="text-[15px] font-semibold tracking-tight text-foreground">Équipe</h2>
              <p className="mb-4 mt-1 text-[13px] text-muted-foreground">
                Cette tablette est reliée à <strong>{deviceSite.name}</strong>.
              </p>
              <Link
                href="/connexion"
                className="inline-flex h-9 w-full items-center justify-center rounded-md bg-foreground px-4 text-[13px] font-medium text-background hover:bg-foreground/90"
              >
                Ouvrir le pavé de connexion
              </Link>
            </Card>
          ) : (
            <Card className="p-5 sm:p-6">
              <h2 className="text-[15px] font-semibold tracking-tight text-foreground">Tablette de l’équipe</h2>
              <p className="mb-4 mt-1 text-[13px] text-muted-foreground">
                Une seule fois par tablette : saisissez le code de votre établissement. Ensuite, serveurs et cuisiniers
                se connectent avec leur code à 4 chiffres.
              </p>
              <BindDeviceForm />
            </Card>
          )}
        </div>
        <p className="mt-8 text-xs text-muted-foreground">
          <Link href="/" className="hover:underline">
            Accueil
          </Link>{" "}
          · <Link href="/guide" className="hover:underline">
            Guide de démarrage
          </Link>{" "}
          · <Link href="/confidentialite" className="hover:underline">
            Confidentialité
          </Link>
        </p>
      </main>
    </BrandScope>
  );
}

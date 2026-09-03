import type { Metadata } from "next";
import { ActionButton, CreateForm } from "@/components/direction/forms";
import { TeamDirectory } from "@/components/direction/team-directory";
import { EmptyState, PageHeader, SiteTabs } from "@/components/direction/ui";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { addStaffAction, inviteDirectorAction, updateStaffAction } from "@/lib/direction-actions";
import { pageDirector } from "@/lib/page-guards";
import { getSitesForTenant } from "@/lib/site-store";
import { getUsersForTenant } from "@/lib/user-store";
import { ROLE_LABELS, STAFF_ROLES } from "@/types";

export const metadata: Metadata = { title: "Équipe" };

export default async function EquipePage({ searchParams }: { searchParams: Promise<{ site?: string }> }) {
  const { site: siteParam } = await searchParams;
  const { user: me, tenant } = await pageDirector();
  const sites = (await getSitesForTenant(tenant.id)).filter((s) => s.active);
  const site = sites.find((s) => s.id === siteParam) ?? sites[0];
  const users = await getUsersForTenant(tenant.id);
  const staff = users.filter((u) => u.role !== "director");
  const directors = users.filter((u) => u.role === "director");

  return (
    <>
      <PageHeader title="Équipe" description="Organisation par établissement, puis service ou cuisine. La recherche porte sur toute la chaîne." />
      {sites.length > 1 && <SiteTabs sites={sites} current={site?.id ?? null} basePath="/direction/equipe" />}

      {site && (
        <section className="mb-8 rounded-lg border border-border bg-card p-4">
          <h2 className="mb-3 text-base font-bold text-foreground">Ajouter à l’équipe de {site.name}</h2>
          <CreateForm action={addStaffAction} submitLabel="Ajouter" className="grid gap-3 sm:grid-cols-[1fr_10rem_9rem_auto] sm:items-end">
            <input type="hidden" name="siteId" value={site.id} />
            <label className="block text-sm font-medium">
              Prénom
              <Input name="name" required placeholder="Camille" autoComplete="off" className="mt-1 min-h-11" />
            </label>
            <label className="block text-sm font-medium">
              Rôle
              <Select name="role" defaultValue="waiter" className="mt-1 min-h-11 w-full">
                {STAFF_ROLES.map((r) => (
                  <option key={r} value={r}>
                    {ROLE_LABELS[r]}
                  </option>
                ))}
              </Select>
            </label>
            <label className="block text-sm font-medium">
              Code à 4 chiffres
              <Input name="pin" inputMode="numeric" pattern="[0-9]{4}" maxLength={4} required placeholder="1234" autoComplete="off" className="mt-1 min-h-11 text-center text-lg tracking-[0.4em]" />
            </label>
          </CreateForm>
        </section>
      )}

      {staff.length === 0 ? (
        <EmptyState title="Personne dans l’équipe pour l’instant" description="Ajoutez un serveur et un cuisinier : ils pourront se connecter immédiatement sur la tablette." />
      ) : (
        <TeamDirectory staff={staff} sites={sites} />
      )}

      <section className="mt-10">
        <h2 className="mb-1 text-lg font-bold text-foreground">Direction</h2>
        <p className="mb-3 text-sm text-muted-foreground">Accès complet à tous les établissements, avec e-mail et mot de passe.</p>
        <ul className="mb-4 grid gap-2 md:grid-cols-2">
          {directors.map((d) => (
            <li key={d.id} className="flex items-center justify-between rounded-lg border border-border bg-card px-4 py-3">
              <div>
                <p className="font-semibold text-foreground">
                  {d.name} {d.id === me.id && <span className="text-xs text-muted-foreground">(vous)</span>}
                </p>
                <p className="text-xs text-muted-foreground">{d.email}</p>
              </div>
              {d.id !== me.id && (
                <ActionButton
                  action={updateStaffAction}
                  fields={{ id: d.id, active: d.active ? "false" : "true" }}
                  message={d.active ? `${d.name} désactivé` : `${d.name} réactivé`}
                  variant="secondary"
                  size="sm"
                >
                  {d.active ? "Désactiver" : "Réactiver"}
                </ActionButton>
              )}
            </li>
          ))}
        </ul>
        <div className="rounded-lg border border-border bg-card p-4">
          <h3 className="mb-3 text-base font-bold text-foreground">Ajouter un compte direction</h3>
          <CreateForm action={inviteDirectorAction} submitLabel="Créer l’accès" className="grid gap-3 sm:grid-cols-[1fr_1fr_1fr_auto] sm:items-end">
            <label className="block text-sm font-medium">
              Nom
              <Input name="name" required className="mt-1 min-h-11" />
            </label>
            <label className="block text-sm font-medium">
              E-mail
              <Input name="email" type="email" required className="mt-1 min-h-11" />
            </label>
            <label className="block text-sm font-medium">
              Mot de passe provisoire
              <Input name="password" type="text" required minLength={10} autoComplete="off" className="mt-1 min-h-11" />
            </label>
          </CreateForm>
        </div>
      </section>
    </>
  );
}

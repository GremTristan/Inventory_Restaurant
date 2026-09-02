import type { Metadata } from "next";
import { CreateForm } from "@/components/direction/forms";
import { PageHeader } from "@/components/direction/ui";
import { Input } from "@/components/ui/input";
import { changeOwnPasswordAction } from "@/lib/admin-actions";
import { pageSuperAdmin } from "@/lib/page-guards";

export const metadata: Metadata = { title: "Mon compte" };

export default async function AdminAccountPage() {
  const { user } = await pageSuperAdmin();
  return (
    <>
      <PageHeader title="Mon compte" description={`${user.name} · ${user.email}`} />
      <section className="max-w-xl rounded-card bg-card p-5 shadow-sm">
        <h2 className="text-base font-bold">Mot de passe</h2>
        <CreateForm action={changeOwnPasswordAction} submitLabel="Changer le mot de passe" className="mt-4 grid gap-4">
          <label className="block text-sm font-medium">
            Nouveau mot de passe
            <Input name="password" type="password" required minLength={10} autoComplete="new-password" className="mt-1 min-h-12" />
          </label>
          <label className="block text-sm font-medium">
            Confirmation
            <Input name="confirm" type="password" required minLength={10} autoComplete="new-password" className="mt-1 min-h-12" />
          </label>
        </CreateForm>
        <p className="mt-4 text-xs text-muted-foreground">
          Pour créer un autre compte éditeur : <code className="rounded bg-muted px-1">npm run superadmin -- nom email motdepasse</code> sur le serveur.
        </p>
      </section>
    </>
  );
}

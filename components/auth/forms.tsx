"use client";

import { useActionState } from "react";
import { bindDeviceAction, loginWithPasswordAction, signupAction, type FormState } from "@/lib/auth/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

function ErrorLine({ error }: { error?: string }) {
  if (!error) return null;
  return (
    <p role="alert" className="rounded-control bg-destructive/10 px-4 py-2.5 text-sm font-medium text-destructive">
      {error}
    </p>
  );
}

export function Field({ label, children, hint }: { label: string; children: React.ReactNode; hint?: string }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-sm font-medium text-foreground">{label}</span>
      {children}
      {hint && <span className="mt-1 block text-xs text-muted-foreground">{hint}</span>}
    </label>
  );
}

export function PasswordLoginForm({ next }: { next?: string }) {
  const [state, action, pending] = useActionState<FormState, FormData>(loginWithPasswordAction, {});
  return (
    <form action={action} className="flex flex-col gap-4">
      {next && <input type="hidden" name="suite" value={next} />}
      <Field label="E-mail">
        <Input name="email" type="email" autoComplete="email" required className="min-h-12 text-base" />
      </Field>
      <Field label="Mot de passe">
        <Input name="password" type="password" autoComplete="current-password" required className="min-h-12 text-base" />
      </Field>
      <ErrorLine error={state.error} />
      <Button type="submit" size="lg" disabled={pending} className="w-full">
        {pending ? "Connexion…" : "Se connecter"}
      </Button>
    </form>
  );
}

export function BindDeviceForm() {
  const [state, action, pending] = useActionState<FormState, FormData>(bindDeviceAction, {});
  return (
    <form action={action} className="flex flex-col gap-4">
      <Field label="Code de l’établissement" hint="6 caractères, affiché dans Direction › Établissements.">
        <Input
          name="code"
          inputMode="text"
          autoCapitalize="characters"
          autoComplete="off"
          maxLength={8}
          required
          placeholder="ABC123"
          className="min-h-14 text-center text-2xl font-bold uppercase tracking-[0.3em]"
        />
      </Field>
      <ErrorLine error={state.error} />
      <Button type="submit" size="lg" disabled={pending} className="w-full">
        {pending ? "Vérification…" : "Relier cette tablette"}
      </Button>
    </form>
  );
}

export function SignupForm() {
  const [state, action, pending] = useActionState<FormState, FormData>(signupAction, {});
  return (
    <form action={action} className="flex flex-col gap-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Nom de l’enseigne">
          <Input name="chainName" required placeholder="Crêperie Ty Breizh" className="min-h-12 text-base" />
        </Field>
        <Field label="Premier établissement">
          <Input name="siteName" required placeholder="Genève – Plainpalais" className="min-h-12 text-base" />
        </Field>
      </div>
      <Field label="Votre nom">
        <Input name="name" required autoComplete="name" className="min-h-12 text-base" />
      </Field>
      <Field label="E-mail professionnel">
        <Input name="email" type="email" required autoComplete="email" className="min-h-12 text-base" />
      </Field>
      <Field label="Mot de passe" hint="10 caractères minimum, lettres et chiffres.">
        <Input name="password" type="password" required autoComplete="new-password" minLength={10} className="min-h-12 text-base" />
      </Field>
      <label className="flex items-start gap-3 text-sm text-foreground">
        <input type="checkbox" name="starter" defaultChecked className="mt-1 h-5 w-5 accent-[var(--accent)]" />
        Pré-remplir la carte avec des crêpes classiques (modifiable ensuite)
      </label>
      <label className="flex items-start gap-3 text-sm text-foreground">
        <input type="checkbox" name="cgu" required className="mt-1 h-5 w-5 accent-[var(--accent)]" />
        <span>
          J’accepte les{" "}
          <a href="/cgu" className="font-medium text-accent underline" target="_blank">
            conditions d’utilisation
          </a>{" "}
          et la{" "}
          <a href="/confidentialite" className="font-medium text-accent underline" target="_blank">
            politique de confidentialité
          </a>
          .
        </span>
      </label>
      <ErrorLine error={state.error} />
      <Button type="submit" size="lg" disabled={pending} className="w-full">
        {pending ? "Création…" : "Créer mon espace — 14 jours gratuits"}
      </Button>
    </form>
  );
}

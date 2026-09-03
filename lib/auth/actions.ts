"use server";

import { redirect } from "next/navigation";
import { audit } from "@/lib/audit";
import { hashSecret, isValidEmail, passwordProblem, verifySecret } from "@/lib/auth/password";
import { seedStarterMenu } from "@/lib/onboarding";
import {
  bindDeviceToSite,
  createSession,
  destroySession,
  getDeviceSite,
  homePathFor,
  unbindDevice,
} from "@/lib/session";
import { createSite, getSiteByDeviceCode } from "@/lib/site-store";
import { createTenant, getTenantById, isTenantUsable } from "@/lib/tenant-store";
import {
  createDirectorUser,
  getAuthUserByEmail,
  getAuthUserById,
  recordFailedAttempt,
  resetFailedAttempts,
} from "@/lib/user-store";

export interface FormState {
  error?: string;
  ok?: boolean;
}

const LOCK_AFTER = 5;
const LOCK_MINUTES = 10;
const TRIAL_DAYS = 14;

function safeNext(value: FormDataEntryValue | null): string | null {
  if (typeof value !== "string" || !value.startsWith("/") || value.startsWith("//")) return null;
  return value;
}

function isLocked(lockedUntil: string | null): boolean {
  return Boolean(lockedUntil && new Date(lockedUntil).getTime() > Date.now());
}

// --- Shared tablet: bind once with the site's code ---

export async function bindDeviceAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const code = formData.get("code");
  if (typeof code !== "string") return { error: "Code d’établissement incorrect." };
  const site = await getSiteByDeviceCode(code);
  if (!site) return { error: "Code d’établissement incorrect." };
  const tenant = await getTenantById(site.tenantId);
  if (!tenant || !isTenantUsable(tenant)) return { error: "Cet établissement n’est pas actif." };
  await bindDeviceToSite(site);
  redirect("/connexion");
}

export async function unbindDeviceAction(): Promise<void> {
  await unbindDevice();
  await destroySession();
  redirect("/connexion");
}

// --- Staff: PIN on a bound tablet ---

export async function loginWithPinAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const userId = formData.get("userId");
  const pin = formData.get("pin");
  if (typeof userId !== "string" || typeof pin !== "string") return { error: "Code incorrect." };

  const site = await getDeviceSite();
  if (!site) return { error: "Cette tablette n’est plus reliée à un établissement." };

  const user = await getAuthUserById(userId);
  // Only staff of THIS site can sign in on this tablet, whatever the UI sent.
  if (!user || !user.active || user.siteId !== site.id || (user.role !== "cook" && user.role !== "waiter")) {
    return { error: "Code incorrect." };
  }
  if (isLocked(user.lockedUntil)) {
    return { error: `Trop d’essais. Réessayez dans ${LOCK_MINUTES} minutes ou demandez un nouveau code à la direction.` };
  }
  if (!(await verifySecret(pin, user.pinHash))) {
    await recordFailedAttempt(user.id, LOCK_AFTER, LOCK_MINUTES);
    return { error: "Code incorrect." };
  }

  const tenant = await getTenantById(site.tenantId);
  if (!tenant || !isTenantUsable(tenant)) return { error: "L’abonnement de votre établissement est inactif." };

  await resetFailedAttempts(user.id);
  await createSession(user);
  redirect(homePathFor(user));
}

// --- Directors / editor: email + password ---

export async function loginWithPasswordAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const email = formData.get("email");
  const password = formData.get("password");
  const next = safeNext(formData.get("suite"));
  if (typeof email !== "string" || typeof password !== "string") return { error: "Identifiants incorrects." };

  const user = await getAuthUserByEmail(email);
  if (!user || !user.active || (user.role !== "director" && user.role !== "superadmin")) {
    return { error: "Identifiants incorrects." };
  }
  if (isLocked(user.lockedUntil)) {
    return { error: `Compte temporairement verrouillé. Réessayez dans ${LOCK_MINUTES} minutes.` };
  }
  if (!(await verifySecret(password, user.passwordHash))) {
    await recordFailedAttempt(user.id, LOCK_AFTER, LOCK_MINUTES);
    return { error: "Identifiants incorrects." };
  }

  await resetFailedAttempts(user.id);
  await createSession(user);
  await audit({ tenantId: user.tenantId, userId: user.id, action: "auth.login" });
  redirect(next && next.startsWith(user.role === "superadmin" ? "/admin" : "/") ? next : homePathFor(user));
}

export async function logoutAction(): Promise<void> {
  await destroySession();
  redirect("/connexion");
}

// --- Self-service sign-up: chain + first site + director, 14-day trial ---

export async function signupAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const chainName = String(formData.get("chainName") ?? "").trim();
  const siteName = String(formData.get("siteName") ?? "").trim();
  const name = String(formData.get("name") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");
  const starter = formData.get("starter") === "on";
  const accepted = formData.get("cgu") === "on";

  if (chainName.length < 2) return { error: "Indiquez le nom de votre enseigne." };
  if (siteName.length < 2) return { error: "Indiquez le nom de votre premier établissement." };
  if (name.length < 2) return { error: "Indiquez votre nom." };
  if (!isValidEmail(email)) return { error: "Adresse e-mail invalide." };
  const problem = passwordProblem(password);
  if (problem) return { error: problem };
  if (!accepted) return { error: "Merci d’accepter les conditions d’utilisation." };
  if (await getAuthUserByEmail(email)) return { error: "Un compte existe déjà avec cet e-mail. Connectez-vous." };

  const tenant = await createTenant({ name: chainName, billingEmail: email, trialDays: TRIAL_DAYS });
  const site = await createSite(tenant.id, siteName);
  const director = await createDirectorUser({
    tenantId: tenant.id,
    name,
    email,
    passwordHash: await hashSecret(password),
  });
  if (starter) await seedStarterMenu(tenant.id, site.id);

  await audit({ tenantId: tenant.id, userId: director.id, action: "tenant.signup", details: { chainName, siteName } });
  await createSession(director);
  redirect("/direction?bienvenue=1");
}

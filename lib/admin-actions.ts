"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { audit } from "@/lib/audit";
import { hashSecret, isValidEmail, passwordProblem } from "@/lib/auth/password";
import type { ActionState } from "@/lib/direction-actions";
import { requireSuperAdmin } from "@/lib/session";
import { deleteTenant, getTenantById, updateTenant } from "@/lib/tenant-store";
import { getAuthUserByEmail, getUserById, setUserPassword } from "@/lib/user-store";
import type { Plan, TenantStatus } from "@/types";

const text = (v: FormDataEntryValue | null, max = 120) => (typeof v === "string" ? v.trim().slice(0, max) : "");

async function tenantOr404(id: string) {
  const tenant = await getTenantById(id);
  if (!tenant) throw new Error("Client introuvable");
  return tenant;
}

const STATUSES: TenantStatus[] = ["trial", "active", "past_due", "canceled", "suspended"];
const PLANS: Plan[] = ["essentiel", "pro"];

// Manual override for support cases (failed webhook, goodwill extension…).
// Stripe remains the source of truth once a subscription exists.
export async function setTenantStatusAction(formData: FormData): Promise<void> {
  const { user } = await requireSuperAdmin();
  const tenant = await tenantOr404(text(formData.get("tenantId")));
  const status = text(formData.get("status")) as TenantStatus;
  if (!STATUSES.includes(status)) throw new Error("Statut inconnu");
  await updateTenant(tenant.id, { status });
  await audit({ tenantId: tenant.id, userId: user.id, action: "admin.tenant.status", targetType: "tenant", targetId: tenant.id, details: { from: tenant.status, to: status } });
  revalidatePath("/admin", "layout");
}

export async function setTenantPlanAction(formData: FormData): Promise<void> {
  const { user } = await requireSuperAdmin();
  const tenant = await tenantOr404(text(formData.get("tenantId")));
  const plan = text(formData.get("plan")) as Plan;
  if (!PLANS.includes(plan)) throw new Error("Formule inconnue");
  await updateTenant(tenant.id, { plan });
  await audit({ tenantId: tenant.id, userId: user.id, action: "admin.tenant.plan", targetType: "tenant", targetId: tenant.id, details: { from: tenant.plan, to: plan } });
  revalidatePath("/admin", "layout");
}

export async function extendTrialAction(formData: FormData): Promise<void> {
  const { user } = await requireSuperAdmin();
  const tenant = await tenantOr404(text(formData.get("tenantId")));
  const days = Math.min(90, Math.max(1, Number(formData.get("days")) || 14));
  const base = tenant.trialEndsAt && new Date(tenant.trialEndsAt).getTime() > Date.now() ? new Date(tenant.trialEndsAt) : new Date();
  const trialEndsAt = new Date(base.getTime() + days * 24 * 60 * 60 * 1000);
  await updateTenant(tenant.id, { status: "trial", trialEndsAt });
  await audit({ tenantId: tenant.id, userId: user.id, action: "admin.tenant.extendTrial", targetType: "tenant", targetId: tenant.id, details: { days, trialEndsAt: trialEndsAt.toISOString() } });
  revalidatePath("/admin", "layout");
}

export async function resetDirectorPasswordAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const { user } = await requireSuperAdmin();
  const tenantId = text(formData.get("tenantId"));
  const target = await getUserById(text(formData.get("userId")));
  if (!target || target.tenantId !== tenantId || target.role !== "director") return { error: "Compte introuvable." };
  const password = text(formData.get("password"), 200);
  const problem = passwordProblem(password);
  if (problem) return { error: problem };
  await setUserPassword(target.id, await hashSecret(password));
  await audit({ tenantId, userId: user.id, action: "admin.user.resetPassword", targetType: "user", targetId: target.id });
  return { ok: true, message: `Mot de passe de ${target.name} réinitialisé. Transmettez-le par un canal sûr.` };
}

export async function deleteTenantAction(formData: FormData): Promise<void> {
  const { user } = await requireSuperAdmin();
  const tenant = await tenantOr404(text(formData.get("tenantId")));
  if (text(formData.get("confirm")) !== tenant.slug) throw new Error(`Tapez « ${tenant.slug} » pour confirmer.`);
  await audit({ tenantId: null, userId: user.id, action: "admin.tenant.delete", targetType: "tenant", targetId: tenant.id, details: { name: tenant.name, slug: tenant.slug } });
  await deleteTenant(tenant.id);
  revalidatePath("/admin", "layout");
  redirect("/admin");
}

export async function changeOwnPasswordAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const { user } = await requireSuperAdmin();
  const password = text(formData.get("password"), 200);
  if (password !== text(formData.get("confirm"), 200)) return { error: "Les deux mots de passe ne correspondent pas." };
  const problem = passwordProblem(password);
  if (problem) return { error: problem };
  await setUserPassword(user.id, await hashSecret(password));
  return { ok: true, message: "Mot de passe modifié." };
}

export async function lookupTenantByEmailAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  await requireSuperAdmin();
  const email = text(formData.get("email")).toLowerCase();
  if (!isValidEmail(email)) return { error: "Adresse e-mail invalide." };
  const found = await getAuthUserByEmail(email);
  if (!found?.tenantId) return { error: "Aucun compte client avec cette adresse." };
  redirect(`/admin/${found.tenantId}`);
}

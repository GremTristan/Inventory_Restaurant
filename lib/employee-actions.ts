"use server";

import { revalidatePath } from "next/cache";
import bcrypt from "bcryptjs";
import { requireDirector } from "@/lib/session";
import { createUser, deleteUser, renameUser, setUserPassword } from "@/lib/user-store";
import { getSiteById } from "@/data/sites";
import type { Role, SiteId } from "@/types";

const EMPLOYEES_PATH = "/dashboard/employes";

function assertValidPin(pin: unknown): asserts pin is string {
  if (typeof pin !== "string" || !/^\d{4}$/.test(pin)) {
    throw new Error("Le code PIN doit contenir exactement 4 chiffres");
  }
}

export async function createEmployeeAction(formData: FormData) {
  await requireDirector();

  const name = formData.get("name");
  const role = formData.get("role");
  const siteId = formData.get("siteId");
  const pin = formData.get("pin");

  if (typeof name !== "string" || name.trim() === "") {
    throw new Error("Nom invalide");
  }
  if (role !== "manager" && role !== "waiter") {
    throw new Error("Rôle invalide");
  }
  if (typeof siteId !== "string" || !getSiteById(siteId)) {
    throw new Error("Établissement invalide");
  }
  assertValidPin(pin);

  await createUser({
    name: name.trim(),
    role: role as Role,
    siteId: siteId as SiteId,
    passwordHash: bcrypt.hashSync(pin, 10),
  });
  revalidatePath(EMPLOYEES_PATH);
}

export async function renameEmployeeAction(formData: FormData) {
  await requireDirector();

  const id = formData.get("id");
  const name = formData.get("name");
  if (typeof id !== "string" || typeof name !== "string" || name.trim() === "") {
    throw new Error("Données invalides");
  }

  await renameUser(id, name.trim());
  revalidatePath(EMPLOYEES_PATH);
}

export async function deleteEmployeeAction(formData: FormData) {
  await requireDirector();

  const id = formData.get("id");
  if (typeof id !== "string") {
    throw new Error("Données invalides");
  }

  await deleteUser(id);
  revalidatePath(EMPLOYEES_PATH);
}

export async function changeEmployeePinAction(formData: FormData) {
  await requireDirector();

  const id = formData.get("id");
  const pin = formData.get("pin");
  if (typeof id !== "string") {
    throw new Error("Données invalides");
  }
  assertValidPin(pin);

  await setUserPassword(id, bcrypt.hashSync(pin, 10));
  revalidatePath(EMPLOYEES_PATH);
}

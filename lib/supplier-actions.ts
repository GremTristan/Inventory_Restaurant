"use server";

import { revalidatePath } from "next/cache";
import { requireDirector } from "@/lib/session";
import {
  addSupplier,
  deleteSupplier,
  renameSupplier,
  setItemSupplier,
} from "@/lib/inventory-store";

const SUPPLIERS_PATH = "/dashboard/suppliers";

export async function createSupplierAction(formData: FormData) {
  await requireDirector();

  const name = formData.get("name");
  if (typeof name !== "string" || name.trim() === "") {
    throw new Error("Nom de fournisseur invalide");
  }

  await addSupplier(name.trim());
  revalidatePath(SUPPLIERS_PATH);
}

export async function renameSupplierAction(formData: FormData) {
  await requireDirector();

  const id = formData.get("id");
  const name = formData.get("name");
  if (typeof id !== "string" || typeof name !== "string" || name.trim() === "") {
    throw new Error("Données invalides");
  }

  await renameSupplier(id, name.trim());
  revalidatePath(SUPPLIERS_PATH);
}

export async function deleteSupplierAction(formData: FormData) {
  await requireDirector();

  const id = formData.get("id");
  if (typeof id !== "string") {
    throw new Error("Données invalides");
  }

  await deleteSupplier(id);
  revalidatePath(SUPPLIERS_PATH);
}

export async function updateItemSupplierAction(formData: FormData) {
  await requireDirector();

  const itemId = formData.get("itemId");
  const supplierId = formData.get("supplierId");
  if (typeof itemId !== "string") {
    throw new Error("Données invalides");
  }

  await setItemSupplier(itemId, typeof supplierId === "string" && supplierId !== "" ? supplierId : null);
  revalidatePath(SUPPLIERS_PATH);
}

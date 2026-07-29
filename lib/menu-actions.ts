"use server";

import { revalidatePath } from "next/cache";
import { requireDirector } from "@/lib/session";
import { addMenuItem, deleteMenuItem, renameMenuItem } from "@/lib/sales-store";
import { getSiteById } from "@/data/sites";
import type { SiteId } from "@/types";

const MENU_PATH = "/dashboard/menu";

export async function createMenuItemAction(formData: FormData) {
  await requireDirector();

  const siteId = formData.get("siteId");
  const name = formData.get("name");
  if (typeof siteId !== "string" || !getSiteById(siteId)) {
    throw new Error("Établissement invalide");
  }
  if (typeof name !== "string" || name.trim() === "") {
    throw new Error("Nom de produit invalide");
  }

  addMenuItem(siteId as SiteId, name.trim());
  revalidatePath(MENU_PATH);
}

export async function renameMenuItemAction(formData: FormData) {
  await requireDirector();

  const id = formData.get("id");
  const name = formData.get("name");
  if (typeof id !== "string" || typeof name !== "string" || name.trim() === "") {
    throw new Error("Données invalides");
  }

  renameMenuItem(id, name.trim());
  revalidatePath(MENU_PATH);
}

export async function deleteMenuItemAction(formData: FormData) {
  await requireDirector();

  const id = formData.get("id");
  if (typeof id !== "string") {
    throw new Error("Données invalides");
  }

  deleteMenuItem(id);
  revalidatePath(MENU_PATH);
}

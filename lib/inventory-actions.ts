"use server";

import { revalidatePath } from "next/cache";
import { requireDirector, requireSiteAccess } from "@/lib/session";
import {
  setItemVisibility,
  setItemCategory,
  addInventoryItem,
  updateInventoryItem,
  deleteInventoryItem,
} from "@/lib/inventory-store";
import { getSiteById } from "@/data/sites";
import { CATEGORY_ORDER, type Category, type SiteId, type Zone } from "@/types";

const ZONE_VALUES: Zone[] = ["cuisine", "salle"];

export async function setItemVisibilityAction(formData: FormData) {
  await requireDirector();

  const itemId = formData.get("itemId");
  const siteId = formData.get("siteId");
  const visible = formData.get("visible");
  const forRole = formData.get("forRole");
  if (
    typeof itemId !== "string" ||
    typeof siteId !== "string" ||
    (forRole !== "manager" && forRole !== "waiter")
  ) {
    throw new Error("Données invalides");
  }

  setItemVisibility(itemId, visible === "true", forRole);
  revalidatePath(`/inventory/${siteId}`);
}

export async function setItemCategoryAction(formData: FormData) {
  await requireDirector();

  const itemId = formData.get("itemId");
  const category = formData.get("category");
  if (
    typeof itemId !== "string" ||
    typeof category !== "string" ||
    !CATEGORY_ORDER.includes(category as Category)
  ) {
    throw new Error("Données invalides");
  }

  setItemCategory(itemId, category as Category);
  revalidatePath("/dashboard/suppliers");
}

export async function addInventoryItemAction(formData: FormData) {
  await requireDirector();

  const siteId = formData.get("siteId");
  const name = formData.get("name");
  const unit = formData.get("unit");
  const category = formData.get("category");
  const zone = formData.get("zone");
  const quantity = Number(formData.get("quantity"));
  const unitPrice = Number(formData.get("unitPrice"));
  const unitsPerPackage = Number(formData.get("unitsPerPackage") || 1);
  const packageContentLabelRaw = formData.get("packageContentLabel");
  const packageContentLabel =
    typeof packageContentLabelRaw === "string" && packageContentLabelRaw.trim() !== ""
      ? packageContentLabelRaw.trim()
      : undefined;

  if (
    typeof siteId !== "string" ||
    !getSiteById(siteId) ||
    typeof name !== "string" ||
    name.trim() === "" ||
    typeof unit !== "string" ||
    unit.trim() === "" ||
    typeof category !== "string" ||
    !CATEGORY_ORDER.includes(category as Category) ||
    typeof zone !== "string" ||
    !ZONE_VALUES.includes(zone as Zone) ||
    !Number.isFinite(quantity) ||
    quantity < 0 ||
    !Number.isFinite(unitPrice) ||
    unitPrice < 0 ||
    !Number.isFinite(unitsPerPackage) ||
    unitsPerPackage < 1
  ) {
    throw new Error("Données invalides");
  }

  addInventoryItem({
    siteId: siteId as SiteId,
    name: name.trim(),
    unit: unit.trim(),
    unitsPerPackage,
    packageContentLabel: unitsPerPackage > 1 ? packageContentLabel : undefined,
    category: category as Category,
    zone: zone as Zone,
    quantity,
    unitPrice,
  });
  revalidatePath("/dashboard/suppliers");
}

// Quantity can be persisted by manager/waiter (they count stock) or
// director; unitPrice only by the director (only InventoryTable exposes a
// price field, and only to that role) — checked explicitly here rather than
// relying on the UI hiding the field, since server actions are reachable by
// direct POST regardless of what's rendered.
export async function updateInventoryItemAction(formData: FormData) {
  const itemId = formData.get("itemId");
  const siteId = formData.get("siteId");
  const quantityRaw = formData.get("quantity");
  const unitPriceRaw = formData.get("unitPrice");

  if (typeof itemId !== "string" || typeof siteId !== "string" || !getSiteById(siteId)) {
    throw new Error("Données invalides");
  }

  await requireSiteAccess(siteId as SiteId, ["manager", "waiter"]);

  const changes: { quantity?: number; unitPrice?: number } = {};

  if (typeof quantityRaw === "string" && quantityRaw !== "") {
    const quantity = Number(quantityRaw);
    if (!Number.isFinite(quantity) || quantity < 0) {
      throw new Error("Quantité invalide");
    }
    changes.quantity = quantity;
  }

  if (typeof unitPriceRaw === "string" && unitPriceRaw !== "") {
    await requireDirector();
    const unitPrice = Number(unitPriceRaw);
    if (!Number.isFinite(unitPrice) || unitPrice < 0) {
      throw new Error("Prix invalide");
    }
    changes.unitPrice = unitPrice;
  }

  updateInventoryItem(itemId, changes);
  revalidatePath(`/inventory/${siteId}`);
}

export async function deleteInventoryItemAction(formData: FormData) {
  await requireDirector();

  const itemId = formData.get("itemId");
  const siteId = formData.get("siteId");
  if (typeof itemId !== "string" || typeof siteId !== "string") {
    throw new Error("Données invalides");
  }

  deleteInventoryItem(itemId);
  revalidatePath(`/inventory/${siteId}`);
}

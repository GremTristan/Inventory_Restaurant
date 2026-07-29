"use server";

import { revalidatePath } from "next/cache";
import { requireDirector } from "@/lib/session";
import { setInventoryAccess } from "@/lib/sales-store";
import { getSiteById } from "@/data/sites";
import type { SiteId } from "@/types";

export async function setInventoryAccessAction(formData: FormData) {
  await requireDirector();

  const siteId = formData.get("siteId");
  const granted = formData.get("granted");
  if (typeof siteId !== "string" || !getSiteById(siteId)) {
    throw new Error("Données invalides");
  }

  setInventoryAccess(siteId as SiteId, granted === "true");

  revalidatePath("/dashboard");
  revalidatePath(`/inventory/${siteId}`);
}

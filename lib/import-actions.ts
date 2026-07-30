"use server";

import { requireDirector } from "@/lib/session";
import { runImport, type ImportReport } from "@/lib/import/orchestrator";
import { getSiteById } from "@/data/sites";
import type { SiteId } from "@/types";

const MAX_FILE_BYTES = 20 * 1024 * 1024;
const MAX_IMAGE_BYTES = 40 * 1024 * 1024;
const ACCEPTED_IMAGE_TYPES = new Set(["image/jpeg", "image/png", "image/webp", "image/gif"]);
const ACCEPTED_FILE_EXTENSIONS = [".csv", ".xlsx", ".xlsm"];

// Director-only entry point for the data import pipeline (see
// lib/import/orchestrator.ts). Accepts any mix of a tabular file (CSV/
// Excel), a photo, and free text in one submission — the classifier decides
// what it's looking at. Written data always lands under the director's
// currently selected site; there's no cross-site import in one submission.
export async function runImportAction(formData: FormData): Promise<ImportReport> {
  const user = await requireDirector();

  const siteIdRaw = formData.get("siteId");
  if (typeof siteIdRaw !== "string" || !getSiteById(siteIdRaw)) {
    return { available: true, error: "Établissement invalide." };
  }
  const siteId = siteIdRaw as SiteId;

  const freeTextRaw = formData.get("message");
  const freeText = typeof freeTextRaw === "string" && freeTextRaw.trim() ? freeTextRaw.trim() : undefined;

  const fileEntry = formData.get("file");
  const hasFile = fileEntry instanceof File && fileEntry.size > 0;
  let file: { name: string; mediaType: string; buffer: Buffer } | undefined;
  if (hasFile) {
    const f = fileEntry as File;
    if (f.size > MAX_FILE_BYTES) {
      return { available: true, error: "Fichier trop volumineux (max 20 Mo)." };
    }
    if (!ACCEPTED_FILE_EXTENSIONS.some((ext) => f.name.toLowerCase().endsWith(ext))) {
      return { available: true, error: "Format de fichier non supporté (.csv, .xlsx ou .xlsm uniquement)." };
    }
    file = { name: f.name, mediaType: f.type, buffer: Buffer.from(await f.arrayBuffer()) };
  }

  const imageEntry = formData.get("image");
  const hasImage = imageEntry instanceof File && imageEntry.size > 0;
  let image: { mediaType: string; buffer: Buffer } | undefined;
  if (hasImage) {
    const img = imageEntry as File;
    if (img.size > MAX_IMAGE_BYTES) {
      return { available: true, error: "Photo trop volumineuse (max 40 Mo)." };
    }
    if (!ACCEPTED_IMAGE_TYPES.has(img.type)) {
      return { available: true, error: "Format de photo non supporté (JPEG, PNG, WebP ou GIF uniquement)." };
    }
    image = { mediaType: img.type, buffer: Buffer.from(await img.arrayBuffer()) };
  }

  if (!freeText && !file && !image) {
    return { available: true, error: "Fournissez un fichier, une photo, ou décrivez les données à importer." };
  }

  return runImport({ siteId, userId: user.id, freeText, file, image });
}

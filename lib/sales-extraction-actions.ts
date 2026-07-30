"use server";

import { requireSiteAccess } from "@/lib/session";
import { getMenuItems } from "@/lib/sales-store";
import { callOllama, type OllamaMessage } from "@/lib/ollama-client";
import { getSiteById } from "@/data/sites";
import type { ExtractedSalesData, SiteId } from "@/types";

export interface ExtractionResult {
  available: boolean;
  data?: ExtractedSalesData;
  error?: string;
}

// The widget/form compress photos client-side before upload (see
// lib/image-compression.ts), so in normal use a submitted file is already
// well under 1MB. This ceiling is a generous fallback for the rare case
// that compression fails — matches lib/ai-avatar-actions.ts's limit.
const MAX_IMAGE_BYTES = 40 * 1024 * 1024;
const ACCEPTED_MEDIA_TYPES = new Set<string>(["image/jpeg", "image/png", "image/webp", "image/gif"]);

// Core extraction logic, callable directly with an already-decoded image
// buffer — shared by extractSalesFromReceiptAction (FormData-based button
// flow below) and the avatar's fill_sales_form_from_photo tool
// (lib/ai-avatar-agent.ts), so the vision prompt/parsing logic exists in
// exactly one place. Performs no auth of its own — callers are responsible
// for calling requireSiteAccess themselves first.
export async function extractSalesFromReceiptCore(
  siteId: SiteId,
  imageBuffer: Buffer
): Promise<ExtractionResult> {
  const menu = await getMenuItems(siteId);
  const menuNames = menu.map((m) => m.name).join(", ") || "(aucun produit au menu)";

  // A single `user` message, no separate `system` message: empirically,
  // splitting the instructions into a system+user pair caused
  // gemma4:31b-cloud requests with an attached image to hang/stall for
  // several minutes (reproduced twice against Ollama Cloud), whereas the
  // same instructions folded into one user message consistently completed
  // in under a minute. Keep everything in one message on purpose.
  const messages: OllamaMessage[] = [
    {
      role: "user",
      content:
        "Tu extrais des données structurées d'une photo de ticket de caisse d'une crêperie. Réponds " +
        "UNIQUEMENT avec un objet JSON valide, sans texte autour, au format exact: " +
        '{"cardRevenue": number|null, "netRevenue": number|null, "items": [{"name": string, "quantity": number}]}. ' +
        "cardRevenue = montant payé par carte bancaire. netRevenue = chiffre d'affaires total du ticket, " +
        "tous moyens de paiement confondus. items = chaque ligne produit avec sa quantité vendue. Si une " +
        "valeur est illisible ou absente, mets null (cardRevenue/netRevenue) ou omets la ligne (items). " +
        "N'invente aucune donnée absente du ticket. Voici la photo du ticket de caisse. Les produits " +
        `possibles au menu de cet établissement sont: ${menuNames}. Utilise ces noms exacts quand un ` +
        "produit du ticket y correspond.",
      images: [imageBuffer.toString("base64")],
    },
  ];

  const result = await callOllama(messages, { format: "json" });

  if (!result.available) return { available: false };
  if (result.error || !result.reply) {
    return { available: true, error: result.error ?? "Réponse vide de l'IA." };
  }

  const parsed = parseExtractedReply(result.reply);
  if (!parsed) {
    return { available: true, error: "La réponse de l'IA n'a pas pu être interprétée. Réessayez." };
  }

  const { matched, unmatchedCount } = matchItemsToMenu(parsed.items, menu);

  return {
    available: true,
    data: { cardRevenue: parsed.cardRevenue, netRevenue: parsed.netRevenue, items: matched, unmatchedCount },
  };
}

// Extracts structured sales data (card revenue, net revenue, per-product
// quantities) from a photographed till receipt, for prefilling
// components/daily-sales-form.tsx's inputs. Never writes a DailySalesEntry
// itself — the waiter always reviews and explicitly submits via the
// existing recordDailySalesAction. Same site/role guard as that action
// (requireSiteAccess(siteId, ["waiter"])) since this gates access to the
// same capability (filling in a day's sales).
export async function extractSalesFromReceiptAction(formData: FormData): Promise<ExtractionResult> {
  const siteIdRaw = formData.get("siteId");
  if (typeof siteIdRaw !== "string" || !getSiteById(siteIdRaw)) {
    return { available: true, error: "Site invalide." };
  }
  const siteId = siteIdRaw as SiteId;
  await requireSiteAccess(siteId, ["waiter"]);

  const file = formData.get("image");
  if (!(file instanceof File) || file.size === 0) {
    return { available: true, error: "Aucune photo fournie." };
  }
  if (file.size > MAX_IMAGE_BYTES) {
    return { available: true, error: "Photo trop volumineuse (max 40 Mo). Réessayez avec une photo plus légère." };
  }
  if (!ACCEPTED_MEDIA_TYPES.has(file.type)) {
    return { available: true, error: "Format de photo non supporté (JPEG, PNG, WebP ou GIF uniquement)." };
  }

  const imageBuffer = Buffer.from(await file.arrayBuffer());
  return extractSalesFromReceiptCore(siteId, imageBuffer);
}

interface RawExtractedReply {
  cardRevenue: number | null;
  netRevenue: number | null;
  items: { name: string; quantity: number }[];
}

// Defensive parsing — must never throw. The model wraps JSON in a
// ```json ... ``` fence despite format:"json" and instructions not to
// (confirmed empirically against gemma4:31b-cloud) — strip that first.
function parseExtractedReply(reply: string): RawExtractedReply | null {
  const stripped = reply
    .trim()
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/```\s*$/i, "")
    .trim();

  try {
    const json = JSON.parse(stripped);
    if (typeof json !== "object" || json === null) return null;

    const toNullableNumber = (v: unknown): number | null =>
      typeof v === "number" && Number.isFinite(v) && v >= 0 ? v : null;

    const items = Array.isArray(json.items)
      ? json.items
          .filter(
            (it: unknown): it is { name: unknown; quantity: unknown } =>
              typeof it === "object" && it !== null
          )
          .map((it: { name: unknown; quantity: unknown }) => ({
            name: typeof it.name === "string" ? it.name : "",
            quantity: typeof it.quantity === "number" && Number.isFinite(it.quantity) ? it.quantity : 0,
          }))
          .filter((it: { name: string; quantity: number }) => it.name.trim() !== "")
      : [];

    return {
      cardRevenue: toNullableNumber(json.cardRevenue),
      netRevenue: toNullableNumber(json.netRevenue),
      items,
    };
  } catch {
    return null;
  }
}

// Case-insensitive, whitespace-trimmed match — cheap insurance against the
// model outputting slightly different casing than the stored menu item.
function matchItemsToMenu(
  items: { name: string; quantity: number }[],
  menu: { id: string; name: string }[]
): { matched: { menuItemId: string; quantity: number }[]; unmatchedCount: number } {
  const byNormalizedName = new Map(menu.map((m) => [m.name.trim().toLowerCase(), m.id]));
  const matched: { menuItemId: string; quantity: number }[] = [];
  let unmatchedCount = 0;

  for (const item of items) {
    const menuItemId = byNormalizedName.get(item.name.trim().toLowerCase());
    if (menuItemId) {
      matched.push({ menuItemId, quantity: item.quantity });
    } else {
      unmatchedCount += 1;
    }
  }

  return { matched, unmatchedCount };
}

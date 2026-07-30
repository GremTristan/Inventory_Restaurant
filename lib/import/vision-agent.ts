import "server-only";

import { callOllama, type OllamaMessage } from "@/lib/ollama-client";
import type { Category, Zone } from "@/types";
import { CATEGORY_ORDER } from "@/types";

const ZONE_VALUES: Zone[] = ["cuisine", "salle"];

export interface VisionSalesRow {
  date: string | null;
  cardRevenue: number | null;
  netRevenue: number | null;
  items: { name: string; quantity: number }[];
}

export interface VisionSalesResult {
  available: boolean;
  data?: VisionSalesRow;
  error?: string;
}

// Vision extraction for a photographed sales document (till receipt or a
// handwritten daily sales sheet) submitted through the director's import
// flow — a generalization of extractSalesFromReceiptCore
// (lib/sales-extraction-actions.ts) that also accepts a date, since a
// historical import isn't implicitly "today" the way the daily-entry flow
// is. Kept as a separate function rather than reusing that one directly:
// that one is hardcoded to "today" and matches items against a specific
// site's menu server-side, neither of which applies here (the site and the
// applicable menu are chosen after classification, not before).
export async function extractSalesFromImage(imageBuffer: Buffer): Promise<VisionSalesResult> {
  const messages: OllamaMessage[] = [
    {
      role: "user",
      content:
        "Tu extrais des données structurées d'une photo d'un document de ventes (ticket de caisse ou " +
        "feuille de ventes manuscrite) d'une crêperie. Réponds UNIQUEMENT avec un objet JSON valide, sans " +
        "texte autour, au format exact: " +
        '{"date": "YYYY-MM-DD"|null, "cardRevenue": number|null, "netRevenue": number|null, ' +
        '"items": [{"name": string, "quantity": number}]}. ' +
        "date = date de la vente si elle apparaît sur le document. cardRevenue = montant payé par carte " +
        "bancaire. netRevenue = chiffre d'affaires total, tous moyens de paiement confondus. items = " +
        "chaque ligne produit avec sa quantité vendue. Si une valeur est illisible ou absente, mets null " +
        "(date/cardRevenue/netRevenue) ou omets la ligne (items). N'invente aucune donnée absente du " +
        "document. Voici la photo.",
      images: [imageBuffer.toString("base64")],
    },
  ];

  const result = await callOllama(messages, { format: "json" });
  if (!result.available) return { available: false };
  if (result.error || !result.reply) {
    return { available: true, error: result.error ?? "Réponse vide de l'IA." };
  }

  const parsed = parseVisionSalesReply(result.reply);
  if (!parsed) {
    return { available: true, error: "La réponse de l'IA n'a pas pu être interprétée. Réessayez." };
  }
  return { available: true, data: parsed };
}

function parseVisionSalesReply(reply: string): VisionSalesRow | null {
  const json = tryParseJson(reply);
  if (!json) return null;

  const toNullableNumber = (v: unknown): number | null =>
    typeof v === "number" && Number.isFinite(v) && v >= 0 ? v : null;

  const items = Array.isArray(json.items)
    ? json.items
        .filter((it: unknown): it is { name: unknown; quantity: unknown } => typeof it === "object" && it !== null)
        .map((it: { name: unknown; quantity: unknown }) => ({
          name: typeof it.name === "string" ? it.name : "",
          quantity: typeof it.quantity === "number" && Number.isFinite(it.quantity) ? it.quantity : 0,
        }))
        .filter((it: { name: string; quantity: number }) => it.name.trim() !== "")
    : [];

  return {
    date: typeof json.date === "string" && /^\d{4}-\d{2}-\d{2}$/.test(json.date) ? json.date : null,
    cardRevenue: toNullableNumber(json.cardRevenue),
    netRevenue: toNullableNumber(json.netRevenue),
    items,
  };
}

export interface VisionInventoryRow {
  name: string;
  quantity: number;
  unit: string;
  unitPrice: number | null;
  category: Category | null;
  zone: Zone | null;
}

export interface VisionInventoryResult {
  available: boolean;
  items?: VisionInventoryRow[];
  error?: string;
}

// Vision extraction for a photographed inventory sheet (a physical stock
// count written on paper). Distinct prompt from extractSalesFromImage since
// the target shape is entirely different (per-article stock rows, not a
// single day's revenue totals).
export async function extractInventoryFromImage(imageBuffer: Buffer): Promise<VisionInventoryResult> {
  const messages: OllamaMessage[] = [
    {
      role: "user",
      content:
        "Tu extrais des données structurées d'une photo d'une feuille d'inventaire (comptage de stock, " +
        "manuscrit ou imprimé) d'une crêperie. Réponds UNIQUEMENT avec un objet JSON valide, sans texte " +
        'autour, au format exact: {"items": [{"name": string, "quantity": number, "unit": string, ' +
        '"unitPrice": number|null, "category": string|null, "zone": string|null}]}. ' +
        "name = nom de l'article. quantity = quantité en stock comptée. unit = unité (kg, pack, " +
        `bouteille, etc.), déduite du contexte si absente explicitement. unitPrice = prix unitaire si ` +
        `visible, sinon null. category = une valeur parmi ${CATEGORY_ORDER.join(", ")} si déductible du ` +
        `contexte, sinon null. zone = une valeur parmi ${ZONE_VALUES.join(", ")} si déductible, sinon ` +
        "null. N'invente aucune donnée absente du document, et n'omets aucune ligne d'article lisible. " +
        "Voici la photo.",
      images: [imageBuffer.toString("base64")],
    },
  ];

  const result = await callOllama(messages, { format: "json" });
  if (!result.available) return { available: false };
  if (result.error || !result.reply) {
    return { available: true, error: result.error ?? "Réponse vide de l'IA." };
  }

  const parsed = parseVisionInventoryReply(result.reply);
  if (!parsed) {
    return { available: true, error: "La réponse de l'IA n'a pas pu être interprétée. Réessayez." };
  }
  return { available: true, items: parsed };
}

function parseVisionInventoryReply(reply: string): VisionInventoryRow[] | null {
  const json = tryParseJson(reply);
  if (!json || !Array.isArray(json.items)) return null;

  return json.items
    .filter((it: unknown): it is Record<string, unknown> => typeof it === "object" && it !== null)
    .map((it: Record<string, unknown>) => ({
      name: typeof it.name === "string" ? it.name.trim() : "",
      quantity: typeof it.quantity === "number" && Number.isFinite(it.quantity) ? it.quantity : 0,
      unit: typeof it.unit === "string" && it.unit.trim() ? it.unit.trim() : "unité",
      unitPrice: typeof it.unitPrice === "number" && Number.isFinite(it.unitPrice) ? it.unitPrice : null,
      category: CATEGORY_ORDER.includes(it.category as Category) ? (it.category as Category) : null,
      zone: ZONE_VALUES.includes(it.zone as Zone) ? (it.zone as Zone) : null,
    }))
    .filter((it) => it.name !== "");
}

function tryParseJson(reply: string): Record<string, unknown> | null {
  const stripped = reply
    .trim()
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/```\s*$/i, "")
    .trim();
  try {
    const json = JSON.parse(stripped);
    return typeof json === "object" && json !== null ? json : null;
  } catch {
    return null;
  }
}

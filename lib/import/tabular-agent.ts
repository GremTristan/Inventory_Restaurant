import "server-only";

import { callOllama, type OllamaMessage } from "@/lib/ollama-client";
import type { ParsedTable } from "@/lib/import/parse-file";
import type { Category, SiteId, Zone } from "@/types";
import { sites } from "@/data/sites";
import { CATEGORY_ORDER } from "@/types";

const ZONE_VALUES: Zone[] = ["cuisine", "salle"];

// --- Sales mapping ---

export interface SalesRowMapping {
  dateColumn: string | null;
  cardRevenueColumn: string | null;
  netRevenueColumn: string | null;
  // Columns whose header names the model matched to an existing menu item
  // name — key is the CSV/Excel column header, value is the menu item name
  // it represents (quantity sold that day). Columns it couldn't confidently
  // match are omitted, never guessed.
  productQuantityColumns: Record<string, string>;
}

export interface MappedSalesRow {
  date: string;
  cardRevenue: number;
  netRevenue: number;
  quantitiesByMenuItemName: Record<string, number>;
  sourceRowIndex: number;
}

export interface TabularSalesResult {
  available: boolean;
  rows?: MappedSalesRow[];
  skipped?: { sourceRowIndex: number; reason: string }[];
  error?: string;
}

// Maps an arbitrary sales-history table to DailySalesEntry fields via one
// LLM call that only figures out the *column mapping* (cheap, one call
// regardless of row count) — the actual per-row value parsing/validation
// below is deterministic code, not the model, so a 500-row import doesn't
// mean 500 model calls and doesn't let the model silently mis-total a
// number.
export async function mapSalesTable(
  table: ParsedTable,
  siteId: SiteId,
  menuItemNames: string[]
): Promise<TabularSalesResult> {
  const sampleRows = table.rows.slice(0, 3);
  const messages: OllamaMessage[] = [
    {
      role: "user",
      content:
        "Tu identifies quelles colonnes d'un fichier tabulaire d'historique de ventes correspondent à " +
        "quels champs. Réponds UNIQUEMENT avec un objet JSON valide, sans texte autour, au format exact: " +
        '{"dateColumn": string|null, "cardRevenueColumn": string|null, "netRevenueColumn": string|null, ' +
        '"productQuantityColumns": {"<nom de colonne>": "<nom de produit du menu>"}}. ' +
        "dateColumn = colonne contenant la date de la vente. cardRevenueColumn = montant payé par carte " +
        "bancaire (CB). netRevenueColumn = chiffre d'affaires total, tous moyens de paiement confondus. " +
        "productQuantityColumns = pour chaque colonne qui correspond clairement à un produit du menu " +
        "ci-dessous (quantité vendue de ce produit), associe le nom exact du produit tel que fourni dans " +
        "la liste. Ignore toute colonne que tu ne peux pas rattacher avec confiance à un de ces champs. " +
        `N'invente aucun nom de colonne absent du fichier.\n\n` +
        `Colonnes du fichier: ${table.headers.join(", ")}\n` +
        `Exemples de lignes: ${JSON.stringify(sampleRows)}\n\n` +
        `Produits du menu de cet établissement: ${menuItemNames.join(", ") || "(aucun)"}`,
    },
  ];

  const result = await callOllama(messages, { format: "json" });
  if (!result.available) return { available: false };
  if (result.error || !result.reply) {
    return { available: true, error: result.error ?? "Réponse vide de l'IA." };
  }

  const mapping = parseSalesMapping(result.reply);
  if (!mapping) {
    return { available: true, error: "Le mappage des colonnes n'a pas pu être interprété." };
  }
  if (!mapping.dateColumn || (!mapping.cardRevenueColumn && !mapping.netRevenueColumn)) {
    return {
      available: true,
      error:
        "Impossible d'identifier une colonne de date et une colonne de chiffre d'affaires dans ce fichier.",
    };
  }

  const rows: MappedSalesRow[] = [];
  const skipped: { sourceRowIndex: number; reason: string }[] = [];

  table.rows.forEach((row, index) => {
    const dateRaw = mapping.dateColumn ? row[mapping.dateColumn] : "";
    const date = normalizeDate(dateRaw);
    if (!date) {
      skipped.push({ sourceRowIndex: index, reason: `Date illisible: "${dateRaw}"` });
      return;
    }

    const cardRevenue = mapping.cardRevenueColumn ? parseAmount(row[mapping.cardRevenueColumn]) : 0;
    const netRevenue = mapping.netRevenueColumn
      ? parseAmount(row[mapping.netRevenueColumn])
      : cardRevenue;

    if (cardRevenue === null || netRevenue === null) {
      skipped.push({ sourceRowIndex: index, reason: "Montant illisible." });
      return;
    }
    if (netRevenue < cardRevenue) {
      skipped.push({ sourceRowIndex: index, reason: "CA net inférieur au montant CB." });
      return;
    }

    const quantitiesByMenuItemName: Record<string, number> = {};
    for (const [column, productName] of Object.entries(mapping.productQuantityColumns)) {
      const qty = parseAmount(row[column]);
      if (qty !== null && qty > 0) quantitiesByMenuItemName[productName] = qty;
    }

    rows.push({ date, cardRevenue, netRevenue, quantitiesByMenuItemName, sourceRowIndex: index });
  });

  return { available: true, rows, skipped };
}

function parseSalesMapping(reply: string): SalesRowMapping | null {
  const json = tryParseJson(reply);
  if (!json) return null;
  return {
    dateColumn: typeof json.dateColumn === "string" ? json.dateColumn : null,
    cardRevenueColumn: typeof json.cardRevenueColumn === "string" ? json.cardRevenueColumn : null,
    netRevenueColumn: typeof json.netRevenueColumn === "string" ? json.netRevenueColumn : null,
    productQuantityColumns:
      typeof json.productQuantityColumns === "object" && json.productQuantityColumns !== null
        ? (json.productQuantityColumns as Record<string, string>)
        : {},
  };
}

// --- Inventory mapping ---

export interface InventoryRowMapping {
  nameColumn: string | null;
  quantityColumn: string | null;
  unitPriceColumn: string | null;
  unitColumn: string | null;
  categoryColumn: string | null;
  zoneColumn: string | null;
}

export interface MappedInventoryRow {
  name: string;
  quantity: number;
  unitPrice: number;
  unit: string;
  category: Category;
  zone: Zone;
  sourceRowIndex: number;
}

export interface TabularInventoryResult {
  available: boolean;
  rows?: MappedInventoryRow[];
  skipped?: { sourceRowIndex: number; reason: string }[];
  error?: string;
}

export async function mapInventoryTable(table: ParsedTable): Promise<TabularInventoryResult> {
  const sampleRows = table.rows.slice(0, 3);
  const messages: OllamaMessage[] = [
    {
      role: "user",
      content:
        "Tu identifies quelles colonnes d'un fichier tabulaire d'inventaire correspondent à quels " +
        "champs. Réponds UNIQUEMENT avec un objet JSON valide, sans texte autour, au format exact: " +
        '{"nameColumn": string|null, "quantityColumn": string|null, "unitPriceColumn": string|null, ' +
        '"unitColumn": string|null, "categoryColumn": string|null, "zoneColumn": string|null}. ' +
        "nameColumn = nom de l'article/ingrédient. quantityColumn = quantité en stock. unitPriceColumn = " +
        "prix unitaire d'achat. unitColumn = unité d'achat (kg, pack, bouteille...). categoryColumn = " +
        `catégorie parmi: ${CATEGORY_ORDER.join(", ")} (si une colonne s'en approche). zoneColumn = zone ` +
        "de stockage parmi: cuisine, salle (si une colonne s'en approche). Mets null pour tout champ sans " +
        "colonne correspondante claire. N'invente aucun nom de colonne absent du fichier.\n\n" +
        `Colonnes du fichier: ${table.headers.join(", ")}\n` +
        `Exemples de lignes: ${JSON.stringify(sampleRows)}`,
    },
  ];

  const result = await callOllama(messages, { format: "json" });
  if (!result.available) return { available: false };
  if (result.error || !result.reply) {
    return { available: true, error: result.error ?? "Réponse vide de l'IA." };
  }

  const mapping = parseInventoryMapping(result.reply);
  if (!mapping) {
    return { available: true, error: "Le mappage des colonnes n'a pas pu être interprété." };
  }
  if (!mapping.nameColumn || !mapping.quantityColumn) {
    return {
      available: true,
      error: "Impossible d'identifier une colonne de nom d'article et de quantité dans ce fichier.",
    };
  }

  const rows: MappedInventoryRow[] = [];
  const skipped: { sourceRowIndex: number; reason: string }[] = [];

  table.rows.forEach((row, index) => {
    const name = mapping.nameColumn ? row[mapping.nameColumn]?.trim() : "";
    if (!name) {
      skipped.push({ sourceRowIndex: index, reason: "Nom d'article manquant." });
      return;
    }

    const quantity = mapping.quantityColumn ? parseAmount(row[mapping.quantityColumn]) : null;
    if (quantity === null || quantity < 0) {
      skipped.push({ sourceRowIndex: index, reason: `Quantité illisible pour "${name}".` });
      return;
    }

    const unitPriceRaw = mapping.unitPriceColumn ? parseAmount(row[mapping.unitPriceColumn]) : 0;
    const unitPrice = unitPriceRaw ?? 0;

    const unit = mapping.unitColumn ? row[mapping.unitColumn]?.trim() : "";
    const categoryRaw = mapping.categoryColumn ? row[mapping.categoryColumn]?.trim().toLowerCase() : "";
    const category = CATEGORY_ORDER.includes(categoryRaw as Category) ? (categoryRaw as Category) : "sec";
    const zoneRaw = mapping.zoneColumn ? row[mapping.zoneColumn]?.trim().toLowerCase() : "";
    const zone = ZONE_VALUES.includes(zoneRaw as Zone) ? (zoneRaw as Zone) : "cuisine";

    rows.push({
      name,
      quantity,
      unitPrice,
      unit: unit || "unité",
      category,
      zone,
      sourceRowIndex: index,
    });
  });

  return { available: true, rows, skipped };
}

function parseInventoryMapping(reply: string): InventoryRowMapping | null {
  const json = tryParseJson(reply);
  if (!json) return null;
  return {
    nameColumn: typeof json.nameColumn === "string" ? json.nameColumn : null,
    quantityColumn: typeof json.quantityColumn === "string" ? json.quantityColumn : null,
    unitPriceColumn: typeof json.unitPriceColumn === "string" ? json.unitPriceColumn : null,
    unitColumn: typeof json.unitColumn === "string" ? json.unitColumn : null,
    categoryColumn: typeof json.categoryColumn === "string" ? json.categoryColumn : null,
    zoneColumn: typeof json.zoneColumn === "string" ? json.zoneColumn : null,
  };
}

// --- Shared parsing helpers ---

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

// Accepts "1234.56", "1234,56", "1'234.56", "CHF 1234.56" — the range of
// formats a director's spreadsheet export is likely to use — but never
// guesses a number out of genuinely non-numeric text.
function parseAmount(raw: string | undefined): number | null {
  if (raw === undefined) return null;
  const cleaned = raw.trim().replace(/[^\d,.\-]/g, "").replace(/'/g, "");
  if (cleaned === "") return null;
  // If both separators appear, assume the last one is the decimal mark.
  const normalized =
    cleaned.includes(",") && cleaned.includes(".")
      ? cleaned.lastIndexOf(",") > cleaned.lastIndexOf(".")
        ? cleaned.replace(/\./g, "").replace(",", ".")
        : cleaned.replace(/,/g, "")
      : cleaned.replace(",", ".");
  const value = Number(normalized);
  return Number.isFinite(value) ? value : null;
}

// Accepts "YYYY-MM-DD", "DD/MM/YYYY", "DD.MM.YYYY" — normalizes to
// "YYYY-MM-DD" (DailySalesEntry.date's stored format). Two-digit years are
// rejected rather than guessed (ambiguous which century).
function normalizeDate(raw: string | undefined): string | null {
  if (!raw) return null;
  const trimmed = raw.trim();

  const isoMatch = trimmed.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (isoMatch) return `${isoMatch[1]}-${isoMatch[2]}-${isoMatch[3]}`;

  const euroMatch = trimmed.match(/^(\d{1,2})[./](\d{1,2})[./](\d{4})$/);
  if (euroMatch) {
    const [, day, month, year] = euroMatch;
    return `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`;
  }

  return null;
}

export function isKnownSiteId(value: string): value is SiteId {
  return sites.some((s) => s.id === value);
}

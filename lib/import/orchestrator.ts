import "server-only";

import { classifyImportInput } from "@/lib/import/classifier-agent";
import { parseTableFile } from "@/lib/import/parse-file";
import { mapInventoryTable, mapSalesTable } from "@/lib/import/tabular-agent";
import { extractInventoryFromImage, extractSalesFromImage } from "@/lib/import/vision-agent";
import { writeInventoryRows, writeSalesRows } from "@/lib/import/writer";
import { getMenuItems } from "@/lib/sales-store";
import type { SiteId } from "@/types";

export interface ImportRequest {
  siteId: SiteId;
  userId: string;
  freeText?: string;
  file?: { name: string; mediaType: string; buffer: Buffer };
  image?: { mediaType: string; buffer: Buffer };
}

export interface ImportReport {
  available: boolean;
  target?: "sales" | "inventory" | "unknown";
  reasoning?: string;
  written?: number;
  skipped?: { input: unknown; reason: string }[];
  error?: string;
}

// Coordinates the import pipeline end to end: classify -> route to the
// target-specific agent (tabular or vision) -> write. Each stage is an
// independent Ollama call with its own narrow prompt (see
// lib/import/classifier-agent.ts, tabular-agent.ts, vision-agent.ts) rather
// than one agent doing everything, so a failure or a bad classification is
// visible and attributable to a single stage instead of buried inside one
// large multi-purpose prompt. Only lib/import/writer.ts ever touches the
// database — every agent up to that point only produces plain data.
export async function runImport(request: ImportRequest): Promise<ImportReport> {
  const table = request.file ? await parseAttachedFile(request.file) : undefined;
  if (table?.error) return { available: true, error: table.error };

  const classification = await classifyImportInput({
    table: table?.table,
    freeText: request.freeText,
    hasImage: Boolean(request.image),
  });
  if (!classification.available) return { available: false };
  if (classification.error) return { available: true, error: classification.error };

  const target = classification.target ?? "unknown";
  if (target === "unknown") {
    return {
      available: true,
      target,
      reasoning: classification.reasoning,
      error:
        "Impossible de déterminer s'il s'agit de ventes ou d'inventaire. Précisez dans votre message, ou " +
        "vérifiez que le fichier contient des en-têtes de colonnes clairs.",
    };
  }

  if (target === "sales") {
    return runSalesImport(request, table?.table);
  }
  return runInventoryImport(request, table?.table);
}

async function parseAttachedFile(
  file: NonNullable<ImportRequest["file"]>
): Promise<{ table?: import("@/lib/import/parse-file").ParsedTable; error?: string }> {
  const result = await parseTableFile(file.name, file.mediaType, file.buffer);
  if (result.error) return { error: result.error };
  return { table: result.table };
}

async function runSalesImport(
  request: ImportRequest,
  table: import("@/lib/import/parse-file").ParsedTable | undefined
): Promise<ImportReport> {
  const menu = await getMenuItems(request.siteId);
  const menuNames = menu.map((m) => m.name);

  if (table) {
    const mapped = await mapSalesTable(table, request.siteId, menuNames);
    if (!mapped.available) return { available: false };
    if (mapped.error) return { available: true, target: "sales", error: mapped.error };

    const outcome = await writeSalesRows(
      request.siteId,
      request.userId,
      (mapped.rows ?? []).map((r) => ({
        date: r.date,
        cardRevenue: r.cardRevenue,
        netRevenue: r.netRevenue,
        quantitiesByMenuItemName: r.quantitiesByMenuItemName,
      }))
    );

    return {
      available: true,
      target: "sales",
      written: outcome.written,
      skipped: [
        ...(mapped.skipped ?? []).map((s) => ({ input: s.sourceRowIndex, reason: s.reason })),
        ...outcome.skipped,
      ],
    };
  }

  if (request.image) {
    const extracted = await extractSalesFromImage(request.image.buffer);
    if (!extracted.available) return { available: false };
    if (extracted.error || !extracted.data) {
      return { available: true, target: "sales", error: extracted.error ?? "Extraction échouée." };
    }
    if (!extracted.data.date) {
      return {
        available: true,
        target: "sales",
        error: "Aucune date lisible sur le document — impossible d'enregistrer une vente historique sans date.",
      };
    }

    const quantitiesByMenuItemName: Record<string, number> = {};
    for (const item of extracted.data.items) {
      quantitiesByMenuItemName[item.name] = item.quantity;
    }

    const outcome = await writeSalesRows(request.siteId, request.userId, [
      {
        date: extracted.data.date,
        cardRevenue: extracted.data.cardRevenue ?? 0,
        netRevenue: extracted.data.netRevenue ?? extracted.data.cardRevenue ?? 0,
        quantitiesByMenuItemName,
      },
    ]);

    return { available: true, target: "sales", written: outcome.written, skipped: outcome.skipped };
  }

  return {
    available: true,
    target: "sales",
    error: "Classé comme historique de ventes, mais aucun fichier ni photo exploitable n'a été fourni.",
  };
}

async function runInventoryImport(
  request: ImportRequest,
  table: import("@/lib/import/parse-file").ParsedTable | undefined
): Promise<ImportReport> {
  if (table) {
    const mapped = await mapInventoryTable(table);
    if (!mapped.available) return { available: false };
    if (mapped.error) return { available: true, target: "inventory", error: mapped.error };

    const outcome = await writeInventoryRows(request.siteId, mapped.rows ?? []);

    return {
      available: true,
      target: "inventory",
      written: outcome.written,
      skipped: [
        ...(mapped.skipped ?? []).map((s) => ({ input: s.sourceRowIndex, reason: s.reason })),
        ...outcome.skipped,
      ],
    };
  }

  if (request.image) {
    const extracted = await extractInventoryFromImage(request.image.buffer);
    if (!extracted.available) return { available: false };
    if (extracted.error || !extracted.items) {
      return { available: true, target: "inventory", error: extracted.error ?? "Extraction échouée." };
    }

    const outcome = await writeInventoryRows(
      request.siteId,
      extracted.items.map((item) => ({
        name: item.name,
        quantity: item.quantity,
        unitPrice: item.unitPrice ?? 0,
        unit: item.unit,
        category: item.category ?? "sec",
        zone: item.zone ?? "cuisine",
      }))
    );

    return { available: true, target: "inventory", written: outcome.written, skipped: outcome.skipped };
  }

  return {
    available: true,
    target: "inventory",
    error: "Classé comme inventaire, mais aucun fichier ni photo exploitable n'a été fourni.",
  };
}

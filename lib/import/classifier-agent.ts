import "server-only";

import { callOllama, type OllamaMessage } from "@/lib/ollama-client";
import type { ParsedTable } from "@/lib/import/parse-file";

export type ImportTarget = "sales" | "inventory" | "unknown";

export interface ClassificationResult {
  available: boolean;
  target?: ImportTarget;
  reasoning?: string;
  error?: string;
}

// First stage of the import pipeline: looks at a small, cheap summary of
// what the director submitted (column headers + a couple of sample rows for
// a file, or the raw text) and decides which specialized agent should
// handle it. Runs before any heavier work (full-table parsing, vision
// extraction) so a misrouted import fails fast with a clear message instead
// of silently writing to the wrong table.
export async function classifyImportInput(input: {
  table?: ParsedTable;
  freeText?: string;
  hasImage: boolean;
}): Promise<ClassificationResult> {
  const summary = buildSummary(input);

  const messages: OllamaMessage[] = [
    {
      role: "user",
      content:
        "Tu classes une donnée soumise par le directeur d'un groupe de crêperies pour import dans son " +
        "système de gestion. Réponds UNIQUEMENT avec un objet JSON valide, sans texte autour, au format " +
        'exact: {"target": "sales"|"inventory"|"unknown", "reasoning": string}. ' +
        '"sales" = historique de chiffre d\'affaires / ventes quotidiennes (montants, CB, quantités ' +
        "vendues par produit, dates de vente). " +
        '"inventory" = articles de stock (nom d\'ingrédient/produit, quantité en stock, prix unitaire, ' +
        "unité, fournisseur). " +
        '"unknown" si le contenu ne correspond clairement à aucun des deux, ou si les deux se mélangent ' +
        "de façon ambiguë. N'invente rien, base-toi uniquement sur ce qui est fourni ci-dessous.\n\n" +
        summary,
    },
  ];

  const result = await callOllama(messages, { format: "json" });
  if (!result.available) return { available: false };
  if (result.error || !result.reply) {
    return { available: true, error: result.error ?? "Réponse vide de l'IA." };
  }

  const parsed = parseClassification(result.reply);
  if (!parsed) {
    return { available: true, error: "La classification n'a pas pu être interprétée." };
  }
  return { available: true, target: parsed.target, reasoning: parsed.reasoning };
}

function buildSummary(input: { table?: ParsedTable; freeText?: string; hasImage: boolean }): string {
  const parts: string[] = [];

  if (input.table) {
    const sampleRows = input.table.rows.slice(0, 3);
    parts.push(
      `Fichier tabulaire avec ${input.table.rows.length} ligne(s). Colonnes: ${input.table.headers.join(", ")}.`,
      `Exemples de lignes: ${JSON.stringify(sampleRows)}`
    );
  }

  if (input.freeText) {
    parts.push(`Message du directeur: "${input.freeText}"`);
  }

  if (input.hasImage) {
    parts.push("Une photo/document a aussi été joint (non visible ici, décide en te basant sur le reste).");
  }

  return parts.join("\n\n") || "Aucune donnée fournie.";
}

function parseClassification(reply: string): { target: ImportTarget; reasoning: string } | null {
  const stripped = reply
    .trim()
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/```\s*$/i, "")
    .trim();

  try {
    const json = JSON.parse(stripped);
    const target = json.target;
    if (target !== "sales" && target !== "inventory" && target !== "unknown") return null;
    return { target, reasoning: typeof json.reasoning === "string" ? json.reasoning : "" };
  } catch {
    return null;
  }
}

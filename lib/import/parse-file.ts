import "server-only";

import Papa from "papaparse";
import ExcelJS from "exceljs";

export interface ParsedTable {
  headers: string[];
  // Each row as header -> cell text. Numbers/dates are stringified here —
  // the tabular import agent (lib/import/tabular-agent.ts) is responsible
  // for parsing values back to the right type per target field, since only
  // it knows what each column actually maps to.
  rows: Record<string, string>[];
}

export interface ParseFileResult {
  available: true;
  table?: ParsedTable;
  error?: string;
}

const CSV_TYPES = new Set(["text/csv", "application/csv", "application/vnd.ms-excel"]);
const XLSX_TYPES = new Set([
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/vnd.ms-excel.sheet.macroEnabled.12",
]);

// Sniffs by extension first (browsers/OSes report inconsistent MIME types
// for CSV in particular), falling back to the declared file.type.
function detectKind(fileName: string, mediaType: string): "csv" | "xlsx" | null {
  const lower = fileName.toLowerCase();
  if (lower.endsWith(".csv")) return "csv";
  if (lower.endsWith(".xlsx") || lower.endsWith(".xlsm")) return "xlsx";
  if (CSV_TYPES.has(mediaType)) return "csv";
  if (XLSX_TYPES.has(mediaType)) return "xlsx";
  return null;
}

// Parses an uploaded CSV or Excel file into a header row + string-keyed data
// rows, for the tabular import agent to interpret. Only the first worksheet
// of an .xlsx is read — multi-sheet imports aren't supported; a director
// with data split across sheets exports/copies each sheet as a separate
// upload instead.
export async function parseTableFile(
  fileName: string,
  mediaType: string,
  buffer: Buffer
): Promise<ParseFileResult> {
  const kind = detectKind(fileName, mediaType);
  if (!kind) {
    return {
      available: true,
      error: "Format de fichier non reconnu — utilisez un fichier .csv ou .xlsx.",
    };
  }

  if (kind === "csv") {
    return parseCsv(buffer);
  }
  return parseXlsx(buffer);
}

function parseCsv(buffer: Buffer): ParseFileResult {
  const text = buffer.toString("utf-8");
  const result = Papa.parse<Record<string, string>>(text, {
    header: true,
    skipEmptyLines: true,
    transformHeader: (h) => h.trim(),
  });

  if (result.errors.length > 0 && result.data.length === 0) {
    return { available: true, error: "Le fichier CSV n'a pas pu être lu." };
  }

  const headers = result.meta.fields ?? [];
  if (headers.length === 0 || result.data.length === 0) {
    return { available: true, error: "Le fichier CSV est vide ou n'a pas d'en-têtes." };
  }

  return { available: true, table: { headers, rows: result.data } };
}

async function parseXlsx(buffer: Buffer): Promise<ParseFileResult> {
  const workbook = new ExcelJS.Workbook();
  try {
    // ExcelJS's own type defs expect a Buffer typed against its bundled
    // @types/node version, which mismatches the project's Node buffer type
    // in strict mode — safe cast, we're passing a real Buffer either way.
    await workbook.xlsx.load(buffer as unknown as Parameters<typeof workbook.xlsx.load>[0]);
  } catch {
    return { available: true, error: "Le fichier Excel n'a pas pu être lu." };
  }

  const sheet = workbook.worksheets[0];
  if (!sheet || sheet.rowCount < 2) {
    return { available: true, error: "Le fichier Excel est vide ou n'a pas de données." };
  }

  const headerRow = sheet.getRow(1);
  const headers: string[] = [];
  headerRow.eachCell({ includeEmpty: false }, (cell, colNumber) => {
    headers[colNumber - 1] = String(cell.value ?? "").trim();
  });
  const filteredHeaders = headers.filter(Boolean);
  if (filteredHeaders.length === 0) {
    return { available: true, error: "Le fichier Excel n'a pas d'en-têtes en première ligne." };
  }

  const rows: Record<string, string>[] = [];
  for (let rowNumber = 2; rowNumber <= sheet.rowCount; rowNumber++) {
    const row = sheet.getRow(rowNumber);
    if (row.cellCount === 0) continue;
    const record: Record<string, string> = {};
    let hasValue = false;
    headers.forEach((header, index) => {
      if (!header) return;
      const cell = row.getCell(index + 1);
      const value = cellToString(cell.value);
      record[header] = value;
      if (value !== "") hasValue = true;
    });
    if (hasValue) rows.push(record);
  }

  if (rows.length === 0) {
    return { available: true, error: "Le fichier Excel n'a pas de lignes de données." };
  }

  return { available: true, table: { headers: filteredHeaders, rows } };
}

function cellToString(value: ExcelJS.CellValue): string {
  if (value === null || value === undefined) return "";
  if (value instanceof Date) return value.toISOString().slice(0, 10);
  if (typeof value === "object" && "text" in value) return String(value.text ?? "");
  if (typeof value === "object" && "result" in value) return String(value.result ?? "");
  return String(value);
}

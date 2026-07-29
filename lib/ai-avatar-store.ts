import "server-only";

import fs from "fs";
import path from "path";
import { randomUUID } from "crypto";
import type { ReceiptRecord, SiteId } from "@/types";

// File-backed store for AI-avatar receipt photos + their AI analysis.
// Follows the same readStore()/writeStore() pattern as sales-store.ts and
// inventory-store.ts, but keeps large binary payloads out of the JSON file
// itself: the JSON here only ever holds small metadata records, while the
// actual image bytes live under data/receipts/<siteId>/<id>.<ext>. Every
// store in this app re-parses its whole JSON file on every read, so keeping
// megabyte-sized photos out of that hot path matters here more than it did
// for the one-shot narrative feature's transient API call.
const DATA_FILE = path.join(process.cwd(), "data", "ai-avatar-config.json");
const RECEIPTS_DIR = path.join(process.cwd(), "data", "receipts");

interface StoreData {
  receipts: ReceiptRecord[];
}

function seed(): StoreData {
  return { receipts: [] };
}

function readStore(): StoreData {
  if (!fs.existsSync(DATA_FILE)) {
    const data = seed();
    writeStore(data);
    return data;
  }
  const raw = fs.readFileSync(DATA_FILE, "utf-8");
  const data = JSON.parse(raw) as StoreData;
  data.receipts = data.receipts ?? [];
  return data;
}

function writeStore(data: StoreData) {
  const tmpFile = `${DATA_FILE}.${process.pid}.tmp`;
  fs.writeFileSync(tmpFile, JSON.stringify(data, null, 2), "utf-8");
  fs.renameSync(tmpFile, DATA_FILE);
}

const EXT_BY_MEDIA_TYPE: Record<ReceiptRecord["imageMediaType"], string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/gif": "gif",
};

// Persists the raw image bytes to data/receipts/<siteId>/<id>.<ext> and
// records the metadata + AI summary. Called by ai-avatar-actions.ts only
// after a successful vision API call — a ReceiptRecord always has a
// non-empty aiSummary.
export function saveReceipt(input: {
  siteId: SiteId;
  submittedByUserId: string;
  imageBuffer: Buffer;
  imageMediaType: ReceiptRecord["imageMediaType"];
  aiSummary: string;
}): ReceiptRecord {
  const id = randomUUID();
  const ext = EXT_BY_MEDIA_TYPE[input.imageMediaType];
  // Plain string concatenation rather than path.join for the dynamic
  // (siteId-dependent) segments: Turbopack's build-time file tracer flags
  // path.join calls that mix a runtime variable into the path as "unable to
  // statically analyze", which pulls the whole project into its trace. The
  // static-prefix path.join(process.cwd(), "data", ...) calls elsewhere in
  // this file are unaffected — only the variable segments need this.
  const siteDir = `${RECEIPTS_DIR}/${input.siteId}`;
  fs.mkdirSync(siteDir, { recursive: true });
  const imagePath = `${input.siteId}/${id}.${ext}`;
  fs.writeFileSync(`${RECEIPTS_DIR}/${imagePath}`, input.imageBuffer);

  const data = readStore();
  const record: ReceiptRecord = {
    id,
    siteId: input.siteId,
    submittedByUserId: input.submittedByUserId,
    submittedAt: new Date().toISOString(),
    imagePath,
    imageMediaType: input.imageMediaType,
    aiSummary: input.aiSummary,
  };
  data.receipts.push(record);
  writeStore(data);
  return record;
}

export function getReceiptsBySite(siteId: SiteId): ReceiptRecord[] {
  return readStore()
    .receipts.filter((r) => r.siteId === siteId)
    .sort((a, b) => b.submittedAt.localeCompare(a.submittedAt));
}

// Waiter/manager-facing read: only the photos that specific user submitted —
// never exposes what other staff at the same site submitted, matching this
// app's existing per-role scoping discipline (cf.
// getVisibleInventoryBySiteForRole in lib/inventory-store.ts).
export function getReceiptsBySiteForUser(siteId: SiteId, userId: string): ReceiptRecord[] {
  return getReceiptsBySite(siteId).filter((r) => r.submittedByUserId === userId);
}

// Every receipt across every site — director-only concern, enforced by the
// caller (lib/ai-avatar-actions.ts), not here.
export function getAllReceipts(): ReceiptRecord[] {
  return readStore().receipts.sort((a, b) => b.submittedAt.localeCompare(a.submittedAt));
}

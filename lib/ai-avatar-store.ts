import "server-only";

import { put } from "@vercel/blob";
import { desc, eq } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { receipts } from "@/lib/db/schema";
import type { ReceiptRecord, SiteId } from "@/types";

// Postgres-backed store for AI-avatar receipt metadata; image bytes live in
// Vercel Blob (not in the DB) — migrated off data/ai-avatar-config.json +
// data/receipts/ (see scripts/migrate-json-to-postgres.ts).

const EXT_BY_MEDIA_TYPE: Record<ReceiptRecord["imageMediaType"], string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/gif": "gif",
};

function toReceiptRecord(row: typeof receipts.$inferSelect): ReceiptRecord {
  return {
    id: row.id,
    siteId: row.siteId,
    submittedByUserId: row.submittedByUserId,
    submittedAt: row.submittedAt.toISOString(),
    // Full Blob URL now, not a relative disk path — see types/index.ts's
    // ReceiptRecord.imagePath doc comment.
    imagePath: row.imageUrl,
    imageMediaType: row.imageMediaType,
    aiSummary: row.aiSummary,
  };
}

// Uploads the raw image bytes to Vercel Blob and records the metadata + AI
// summary. Called by ai-avatar-actions.ts only after a successful vision API
// call — a ReceiptRecord always has a non-empty aiSummary.
export async function saveReceipt(input: {
  siteId: SiteId;
  submittedByUserId: string;
  imageBuffer: Buffer;
  imageMediaType: ReceiptRecord["imageMediaType"];
  aiSummary: string;
}): Promise<ReceiptRecord> {
  const ext = EXT_BY_MEDIA_TYPE[input.imageMediaType];
  // Till receipts are internal business data, not public assets — stored in
  // the private Blob store created for this project. Nothing renders
  // imagePath as an <img src> today; a future feature that displays receipt
  // photos will need a signed download URL (@vercel/blob's getDownloadUrl),
  // not the raw stored URL.
  const blob = await put(`receipts/${input.siteId}/${crypto.randomUUID()}.${ext}`, input.imageBuffer, {
    access: "private",
    contentType: input.imageMediaType,
    addRandomSuffix: false,
  });

  const [row] = await db
    .insert(receipts)
    .values({
      siteId: input.siteId,
      submittedByUserId: input.submittedByUserId,
      submittedAt: new Date(),
      imageUrl: blob.url,
      imageMediaType: input.imageMediaType,
      aiSummary: input.aiSummary,
    })
    .returning();
  return toReceiptRecord(row);
}

export async function getReceiptsBySite(siteId: SiteId): Promise<ReceiptRecord[]> {
  const rows = await db
    .select()
    .from(receipts)
    .where(eq(receipts.siteId, siteId))
    .orderBy(desc(receipts.submittedAt));
  return rows.map(toReceiptRecord);
}

// Waiter/manager-facing read: only the photos that specific user submitted —
// never exposes what other staff at the same site submitted, matching this
// app's existing per-role scoping discipline (cf.
// getVisibleInventoryBySiteForRole in lib/inventory-store.ts).
export async function getReceiptsBySiteForUser(siteId: SiteId, userId: string): Promise<ReceiptRecord[]> {
  const receiptsForSite = await getReceiptsBySite(siteId);
  return receiptsForSite.filter((r) => r.submittedByUserId === userId);
}

// Every receipt across every site — director-only concern, enforced by the
// caller (lib/ai-avatar-actions.ts), not here.
export async function getAllReceipts(): Promise<ReceiptRecord[]> {
  const rows = await db.select().from(receipts).orderBy(desc(receipts.submittedAt));
  return rows.map(toReceiptRecord);
}

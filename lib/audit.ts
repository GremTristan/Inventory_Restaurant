import "server-only";

import { desc, eq } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { auditLogs } from "@/lib/db/schema";
import type { AuditLogEntry } from "@/types";

// Fire-and-forget append. Auditing must never break the business action it
// describes, so failures are logged and swallowed.
export async function audit(entry: {
  tenantId: string | null;
  siteId?: string | null;
  userId: string | null;
  action: string;
  targetType?: string;
  targetId?: string;
  details?: Record<string, unknown>;
}): Promise<void> {
  try {
    await db.insert(auditLogs).values({
      tenantId: entry.tenantId,
      siteId: entry.siteId ?? null,
      userId: entry.userId,
      action: entry.action,
      targetType: entry.targetType ?? null,
      targetId: entry.targetId ?? null,
      details: entry.details ?? null,
    });
  } catch (error) {
    console.error("[audit] failed to write entry", entry.action, error);
  }
}

export async function getAuditLogForTenant(tenantId: string, limit = 100): Promise<AuditLogEntry[]> {
  const rows = await db
    .select()
    .from(auditLogs)
    .where(eq(auditLogs.tenantId, tenantId))
    .orderBy(desc(auditLogs.createdAt))
    .limit(limit);
  return rows.map((row) => ({
    id: row.id,
    tenantId: row.tenantId,
    siteId: row.siteId,
    userId: row.userId,
    action: row.action,
    targetType: row.targetType,
    targetId: row.targetId,
    details: row.details,
    createdAt: row.createdAt.toISOString(),
  }));
}

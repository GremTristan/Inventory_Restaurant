import { sql } from "drizzle-orm";
import { db } from "@/lib/db/client";

// Uptime probe: proves the app AND the database answer.
export async function GET() {
  try {
    await db.execute(sql`select 1`);
    return Response.json({ ok: true }, { headers: { "cache-control": "no-store" } });
  } catch {
    return Response.json({ ok: false }, { status: 503, headers: { "cache-control": "no-store" } });
  }
}

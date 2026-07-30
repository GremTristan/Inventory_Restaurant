import "server-only";

import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import * as schema from "./schema";

// Pooled connection (PgBouncer, "-pooler" host) — correct for this app's
// per-request serverless query pattern. Migrations use the unpooled URL
// instead (see drizzle.config.ts), never this client.
const sql = neon(process.env.DATABASE_URL!);

export const db = drizzle(sql, { schema });

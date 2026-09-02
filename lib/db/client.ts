import "server-only";

import { neon, neonConfig } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import * as schema from "./schema";

// Local development: when NEON_LOCAL_FETCH_ENDPOINT is set, redirect the
// serverless driver's HTTP transport at a local Neon proxy (see
// .cursor/environment.json) instead of Neon's cloud endpoint. Unset in
// production, so the hosted Vercel/Neon deployment is unaffected.
if (process.env.NEON_LOCAL_FETCH_ENDPOINT) {
  neonConfig.fetchEndpoint = process.env.NEON_LOCAL_FETCH_ENDPOINT;
  neonConfig.useSecureWebSocket = false;
  neonConfig.poolQueryViaFetch = true;
}

// Pooled connection (PgBouncer, "-pooler" host) — correct for this app's
// per-request serverless query pattern. Migrations use the unpooled URL
// instead (see drizzle.config.ts), never this client.
const sql = neon(process.env.DATABASE_URL!);

export const db = drizzle(sql, { schema });

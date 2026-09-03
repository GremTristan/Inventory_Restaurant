import "server-only";

import { neon, neonConfig, type NeonQueryFunction } from "@neondatabase/serverless";
import { drizzle, type NeonHttpDatabase } from "drizzle-orm/neon-http";
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
//
// Lazy init so `next build` can collect page data without requiring the
// connection string at module-evaluation time on every route import.
type Db = NeonHttpDatabase<typeof schema>;

let _db: Db | undefined;

function getDb(): Db {
  if (_db) return _db;
  const url = process.env.DATABASE_URL;
  if (!url) {
    throw new Error("DATABASE_URL is not configured");
  }
  const sql: NeonQueryFunction<false, false> = neon(url);
  _db = drizzle(sql, { schema });
  return _db;
}

export const db: Db = new Proxy({} as Db, {
  get(_target, prop, receiver) {
    const value = Reflect.get(getDb(), prop, receiver);
    return typeof value === "function" ? value.bind(getDb()) : value;
  },
});

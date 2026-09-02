// Readiness probe: run a trivial query through the local Neon HTTP proxy.
// Exits 0 when SQL over the proxy succeeds, non-zero otherwise. Used by
// .cursor/lib.sh (ensure_db) to wait until the database is truly serving.
import { neon, neonConfig } from "@neondatabase/serverless";

neonConfig.fetchEndpoint = "http://db.localtest.me:4444/sql";
neonConfig.useSecureWebSocket = false;
neonConfig.poolQueryViaFetch = true;

const sql = neon("postgres://postgres:postgres@db.localtest.me:5432/main");

try {
  await sql`select 1`;
  process.exit(0);
} catch {
  process.exit(1);
}

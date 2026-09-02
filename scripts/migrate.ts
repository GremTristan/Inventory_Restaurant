import "dotenv/config";
import { config } from "dotenv";
config({ path: ".env.local" });

import { neon, neonConfig } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import { migrate } from "drizzle-orm/neon-http/migrator";

// Applies the Drizzle migrations in ./drizzle over the Neon serverless HTTP
// transport — the same transport the app uses (lib/db/client.ts). This is
// used instead of `drizzle-kit migrate` for local development, because
// drizzle-kit connects over a WebSocket that the local-neon-http-proxy path
// doesn't expose; the HTTP migrator works against the local proxy and the
// real Neon endpoint alike.
if (process.env.NEON_LOCAL_FETCH_ENDPOINT) {
  neonConfig.fetchEndpoint = process.env.NEON_LOCAL_FETCH_ENDPOINT;
  neonConfig.useSecureWebSocket = false;
  neonConfig.poolQueryViaFetch = true;
}

const sql = neon(process.env.DATABASE_URL!);
const db = drizzle(sql);

migrate(db, { migrationsFolder: "./drizzle" })
  .then(() => {
    console.log("Migrations applied.");
    process.exit(0);
  })
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });

// Applies pending SQL migrations from ./drizzle to the database.
// Usage: npm run db:migrate   (uses DATABASE_URL_UNPOOLED, falls back to DATABASE_URL)
import { config } from "dotenv";
import { neon, neonConfig } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import { migrate } from "drizzle-orm/neon-http/migrator";

config({ path: ".env.local", quiet: true });
config({ quiet: true });

// Same HTTP transport as lib/db/client.ts so local Neon proxy and hosted
// Neon both work (`drizzle-kit migrate` uses a WebSocket the proxy lacks).
if (process.env.NEON_LOCAL_FETCH_ENDPOINT) {
  neonConfig.fetchEndpoint = process.env.NEON_LOCAL_FETCH_ENDPOINT;
  neonConfig.useSecureWebSocket = false;
  neonConfig.poolQueryViaFetch = true;
}

async function main() {
  const url = process.env.DATABASE_URL_UNPOOLED ?? process.env.DATABASE_URL;
  if (!url) {
    throw new Error("DATABASE_URL_UNPOOLED (or DATABASE_URL) is required");
  }
  const db = drizzle(neon(url));
  await migrate(db, { migrationsFolder: "./drizzle" });
  console.log("Migrations applied.");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});

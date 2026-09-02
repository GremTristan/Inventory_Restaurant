// Creates (or resets the password of) an editor/super-admin account.
// Usage: npm run superadmin -- "Nom" email@editeur.ch "mot de passe fort"
import { config } from "dotenv";
import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import { eq } from "drizzle-orm";
import bcrypt from "bcryptjs";
import { users } from "../lib/db/schema";

config({ path: ".env.local", quiet: true });
config({ quiet: true });

async function main() {
  const [name, emailRaw, password] = process.argv.slice(2);
  const email = emailRaw?.trim().toLowerCase();
  if (!name || !email || !password) {
    throw new Error('Usage: npm run superadmin -- "Nom" email "mot de passe"');
  }
  if (password.length < 12) throw new Error("Le mot de passe éditeur doit faire au moins 12 caractères.");
  const url = process.env.DATABASE_URL_UNPOOLED ?? process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL_UNPOOLED (or DATABASE_URL) is required");

  const db = drizzle(neon(url));
  const passwordHash = await bcrypt.hash(password, 12);
  const [existing] = await db.select({ id: users.id, role: users.role }).from(users).where(eq(users.email, email));
  if (existing) {
    if (existing.role !== "superadmin") throw new Error(`${email} est déjà un compte client, pas un compte éditeur.`);
    await db.update(users).set({ passwordHash, name, active: true, failedAttempts: 0, lockedUntil: null }).where(eq(users.id, existing.id));
    console.log(`Mot de passe éditeur mis à jour pour ${email}.`);
    return;
  }
  await db.insert(users).values({ tenantId: null, siteId: null, name, email, role: "superadmin", passwordHash, active: true });
  console.log(`Compte éditeur créé : ${email}. Connexion sur /connexion (onglet direction).`);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});

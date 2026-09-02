// Completes the migrated "Crêperies Group" chain so it is sellable:
// prices + categories on the existing card, missing drinks/ingredients,
// recipes (stock decrement), alerts, suppliers, and usable logins.
// Idempotent. Usage: npm run seed:chain
import { config } from "dotenv";
import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import { and, eq, inArray } from "drizzle-orm";
import bcrypt from "bcryptjs";
import { inventoryItems, menuItemIngredients, menuItems, sites, suppliers, tenants, users } from "../lib/db/schema";
import type { Category, MenuCategory, Zone } from "../types";

config({ path: ".env.local", quiet: true });
config({ quiet: true });

const TENANT_SLUG = "creperies-group";
const DIRECTOR_EMAIL = "julien.perret@creperies-group.ch";
const DIRECTOR_PASSWORD = "Creperie2026!";

const CARD: { name: string; price: number; category: MenuCategory }[] = [
  { name: "Galette complète", price: 14.5, category: "salee" },
  { name: "Crêpe jambon-fromage", price: 12, category: "salee" },
  { name: "Crêpe Nutella", price: 7.5, category: "sucree" },
  { name: "Crêpe sucre-citron", price: 6.5, category: "sucree" },
  { name: "Crêpe beurre-sucre", price: 6, category: "sucree" },
  { name: "Coca-Cola", price: 4, category: "boisson" },
  { name: "Cidre brut", price: 6.5, category: "boisson" },
  { name: "Café", price: 3.5, category: "boisson" },
  { name: "Thé", price: 3.5, category: "boisson" },
  { name: "Eau minérale", price: 3.5, category: "boisson" },
];

const EXTRA_STOCK: {
  name: string;
  unit: string;
  unitsPerPackage: number;
  packageContentLabel?: string;
  category: Category;
  zone: Zone;
  quantity: number;
  unitPrice: number;
  threshold: number;
  visibleToServer?: boolean;
}[] = [
  { name: "Coca-Cola", unit: "bouteille", unitsPerPackage: 1, category: "boissons", zone: "salle", quantity: 24, unitPrice: 1.15, threshold: 8, visibleToServer: true },
  { name: "Café", unit: "kg", unitsPerPackage: 1, category: "sec", zone: "salle", quantity: 2, unitPrice: 18.5, threshold: 0.4 },
  { name: "Thé", unit: "sachet", unitsPerPackage: 1, category: "sec", zone: "salle", quantity: 80, unitPrice: 0.18, threshold: 20 },
  { name: "Eau minérale", unit: "bouteille", unitsPerPackage: 1, category: "boissons", zone: "salle", quantity: 24, unitPrice: 0.55, threshold: 8, visibleToServer: true },
  { name: "Citrons", unit: "pièce", unitsPerPackage: 1, category: "frais", zone: "cuisine", quantity: 30, unitPrice: 0.45, threshold: 10 },
];

const THRESHOLDS: Record<string, number> = {
  "Farine de froment": 10,
  "Farine de sarrasin": 8,
  Œufs: 6,
  "Lait entier": 2,
  Beurre: 4,
  Sucre: 8,
  Jambon: 3,
  "Fromage râpé": 3,
  Nutella: 2,
  "Cidre brut": 8,
};

const SITE_SCALE: Record<string, number> = {
  bdf: 1,
  carouge: 1.1,
  molard: 1.5,
  vevey: 0.85,
  philosophe: 0.75,
  hoshy: 1.3,
};

const STAFF_PINS: Record<string, string> = {
  "Alice Dubois": "5821",
  "Léa Moreau": "6394",
  "Marc Fontaine": "4718",
  "Nabil Haddad": "8263",
  "Sophie Berger": "3947",
  "Chloé Rossier": "7519",
  "Julien Rey": "2684",
  "Hugo Currat": "9156",
  "Camille Bovet": "4072",
  "Inès Zbinden": "6831",
  "Thomas Gay": "5290",
  "Maxime Ducret": "1748",
};

const RECIPES: Record<string, { ingredient: string; quantity: number }[]> = {
  "Galette complète": [
    { ingredient: "Farine de sarrasin", quantity: 0.08 },
    { ingredient: "Œufs", quantity: 0.083 },
    { ingredient: "Jambon", quantity: 0.06 },
    { ingredient: "Fromage râpé", quantity: 0.05 },
    { ingredient: "Beurre", quantity: 0.02 },
  ],
  "Crêpe jambon-fromage": [
    { ingredient: "Farine de froment", quantity: 0.07 },
    { ingredient: "Lait entier", quantity: 0.012 },
    { ingredient: "Jambon", quantity: 0.05 },
    { ingredient: "Fromage râpé", quantity: 0.04 },
    { ingredient: "Beurre", quantity: 0.015 },
  ],
  "Crêpe Nutella": [
    { ingredient: "Farine de froment", quantity: 0.07 },
    { ingredient: "Nutella", quantity: 0.035 },
    { ingredient: "Beurre", quantity: 0.01 },
  ],
  "Crêpe sucre-citron": [
    { ingredient: "Farine de froment", quantity: 0.07 },
    { ingredient: "Sucre", quantity: 0.02 },
    { ingredient: "Citrons", quantity: 0.5 },
    { ingredient: "Beurre", quantity: 0.01 },
  ],
  "Crêpe beurre-sucre": [
    { ingredient: "Farine de froment", quantity: 0.07 },
    { ingredient: "Beurre", quantity: 0.02 },
    { ingredient: "Sucre", quantity: 0.02 },
  ],
  "Coca-Cola": [{ ingredient: "Coca-Cola", quantity: 1 }],
  "Cidre brut": [{ ingredient: "Cidre brut", quantity: 1 }],
  Café: [{ ingredient: "Café", quantity: 0.018 }],
  Thé: [{ ingredient: "Thé", quantity: 1 }],
  "Eau minérale": [{ ingredient: "Eau minérale", quantity: 1 }],
};

const SUPPLIER_FOR: Record<string, string> = {
  frais: "Prodega",
  sec: "Prodega",
  viande: "Prodega",
  sucre: "Ferrero Foodservice",
  boissons: "Boissons du Léman",
};

function round(n: number, digits = 3) {
  const f = 10 ** digits;
  return Math.round(n * f) / f;
}

async function main() {
  const url = process.env.DATABASE_URL_UNPOOLED ?? process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL_UNPOOLED (or DATABASE_URL) is required");
  const db = drizzle(neon(url));

  const [tenant] = await db.select().from(tenants).where(eq(tenants.slug, TENANT_SLUG));
  if (!tenant) throw new Error(`Tenant « ${TENANT_SLUG} » introuvable. Appliquez d’abord les migrations.`);

  await db
    .update(tenants)
    .set({
      name: "Crêperies Group",
      legalName: "Crêperies Group SA",
      legalAddress: "Rue du Rhône 12, 1204 Genève",
      billingEmail: DIRECTOR_EMAIL,
      brandColor: "#1f6f5c",
      currency: "CHF",
      status: "active",
      plan: "pro",
    })
    .where(eq(tenants.id, tenant.id));

  const chainSites = await db.select().from(sites).where(eq(sites.tenantId, tenant.id));

  const supplierIds = new Map<string, string>();
  for (const name of ["Prodega", "Ferrero Foodservice", "Boissons du Léman"]) {
    const [existing] = await db
      .select()
      .from(suppliers)
      .where(and(eq(suppliers.tenantId, tenant.id), eq(suppliers.name, name)));
    if (existing) {
      supplierIds.set(name, existing.id);
    } else {
      const [row] = await db.insert(suppliers).values({ tenantId: tenant.id, name }).returning();
      supplierIds.set(name, row.id);
    }
  }

  const catalogNames = CARD.map((c) => c.name);

  for (const site of chainSites) {
    const scale = SITE_SCALE[site.slug] ?? 1;
    const stock = await db.select().from(inventoryItems).where(eq(inventoryItems.siteId, site.id));
    const byName = new Map(stock.map((row) => [row.name, row]));

    for (const extra of EXTRA_STOCK) {
      if (byName.has(extra.name)) continue;
      const [row] = await db
        .insert(inventoryItems)
        .values({
          tenantId: tenant.id,
          siteId: site.id,
          name: extra.name,
          unit: extra.unit,
          unitsPerPackage: extra.unitsPerPackage,
          packageContentLabel: extra.packageContentLabel ?? null,
          quantity: round(extra.quantity * scale).toString(),
          unitPrice: extra.unitPrice.toFixed(2),
          lowStockThreshold: extra.threshold.toString(),
          category: extra.category,
          zone: extra.zone,
          visibleToManager: true,
          visibleToServer: extra.visibleToServer ?? extra.category === "boissons",
          supplierId: supplierIds.get(SUPPLIER_FOR[extra.category]) ?? null,
        })
        .returning();
      byName.set(row.name, row);
    }

    for (const item of byName.values()) {
      const threshold = THRESHOLDS[item.name] ?? (item.lowStockThreshold ? Number(item.lowStockThreshold) : null);
      const supplierName = SUPPLIER_FOR[item.category];
      await db
        .update(inventoryItems)
        .set({
          lowStockThreshold: threshold === null ? item.lowStockThreshold : threshold.toString(),
          supplierId: supplierName ? (supplierIds.get(supplierName) ?? item.supplierId) : item.supplierId,
        })
        .where(eq(inventoryItems.id, item.id));
    }

    const menu = await db.select().from(menuItems).where(eq(menuItems.siteId, site.id));
    const menuByName = new Map(menu.map((row) => [row.name, row]));
    const keepIds: string[] = [];

    for (const [index, product] of CARD.entries()) {
      const existing = menuByName.get(product.name);
      if (existing) {
        await db
          .update(menuItems)
          .set({
            price: product.price.toFixed(2),
            category: product.category,
            available: true,
            sortOrder: index,
          })
          .where(eq(menuItems.id, existing.id));
        keepIds.push(existing.id);
      } else {
        const [row] = await db
          .insert(menuItems)
          .values({
            tenantId: tenant.id,
            siteId: site.id,
            name: product.name,
            price: product.price.toFixed(2),
            category: product.category,
            available: true,
            sortOrder: index,
          })
          .returning();
        keepIds.push(row.id);
        menuByName.set(row.name, row);
      }
    }

    const stale = menu.filter((row) => !catalogNames.includes(row.name)).map((row) => row.id);
    if (stale.length > 0) {
      await db.delete(menuItems).where(inArray(menuItems.id, stale));
    }

    const freshStock = await db.select().from(inventoryItems).where(eq(inventoryItems.siteId, site.id));
    const stockId = new Map(freshStock.map((row) => [row.name, row.id]));
    const freshMenu = await db.select().from(menuItems).where(eq(menuItems.siteId, site.id));

    for (const product of freshMenu) {
      const recipe = RECIPES[product.name] ?? [];
      await db.delete(menuItemIngredients).where(eq(menuItemIngredients.menuItemId, product.id));
      for (const line of recipe) {
        const inventoryItemId = stockId.get(line.ingredient);
        if (!inventoryItemId) continue;
        await db.insert(menuItemIngredients).values({
          menuItemId: product.id,
          inventoryItemId,
          quantity: line.quantity.toString(),
        });
      }
    }
  }

  const staff = await db.select().from(users).where(eq(users.tenantId, tenant.id));
  for (const person of staff) {
    if (person.role === "director") {
      await db
        .update(users)
        .set({
          email: DIRECTOR_EMAIL,
          passwordHash: await bcrypt.hash(DIRECTOR_PASSWORD, 10),
          pinHash: null,
          failedAttempts: 0,
          lockedUntil: null,
          active: true,
        })
        .where(eq(users.id, person.id));
      continue;
    }
    const pin = STAFF_PINS[person.name];
    if (!pin) continue;
    await db
      .update(users)
      .set({
        pinHash: await bcrypt.hash(pin, 10),
        failedAttempts: 0,
        lockedUntil: null,
        active: true,
      })
      .where(eq(users.id, person.id));
  }

  const recipes = await db.select({ id: menuItemIngredients.id }).from(menuItemIngredients);
  console.log(`Chaîne ${tenant.name} prête.`);
  console.log(`  ${chainSites.length} établissements · carte ${CARD.length} produits · ${recipes.length} lignes de recette`);
  console.log(`  Direction : ${DIRECTOR_EMAIL}  /  ${DIRECTOR_PASSWORD}`);
  console.log("  Tablettes :");
  for (const site of chainSites.sort((a, b) => a.name.localeCompare(b.name, "fr"))) {
    const people = staff.filter((u) => u.siteId === site.id);
    const pins = people.map((u) => `${u.name} ${STAFF_PINS[u.name] ?? "—"} (${u.role === "cook" ? "cuisine" : "service"})`).join(" · ");
    console.log(`    ${site.name.padEnd(12)} code tablette ${site.deviceCode}  —  ${pins}`);
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});

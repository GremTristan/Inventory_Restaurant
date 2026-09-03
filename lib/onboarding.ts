import "server-only";

import { db } from "@/lib/db/client";
import { menuItems } from "@/lib/db/schema";
import type { MenuCategory } from "@/types";

// A typical crêperie card so a brand-new site can take its first order
// within minutes. Prices are in the tenant's currency and editable later.
const STARTER_MENU: { name: string; price: number; category: MenuCategory }[] = [
  { name: "Complète (jambon, œuf, fromage)", price: 14, category: "salee" },
  { name: "Jambon fromage", price: 12, category: "salee" },
  { name: "Chèvre miel", price: 14.5, category: "salee" },
  { name: "Saumon crème ciboulette", price: 16, category: "salee" },
  { name: "Champignons crème", price: 13.5, category: "salee" },
  { name: "Beurre sucre", price: 6, category: "sucree" },
  { name: "Nutella", price: 7.5, category: "sucree" },
  { name: "Caramel beurre salé", price: 8, category: "sucree" },
  { name: "Citron sucre", price: 6.5, category: "sucree" },
  { name: "Banane chocolat", price: 8.5, category: "sucree" },
  { name: "Cidre brut 25cl", price: 5, category: "boisson" },
  { name: "Eau minérale 50cl", price: 3.5, category: "boisson" },
  { name: "Café", price: 3.5, category: "boisson" },
  { name: "Thé", price: 3.5, category: "boisson" },
];

export async function seedStarterMenu(tenantId: string, siteId: string): Promise<void> {
  await db.insert(menuItems).values(
    STARTER_MENU.map((item, index) => ({
      tenantId,
      siteId,
      name: item.name,
      price: item.price.toFixed(2),
      category: item.category,
      sortOrder: index,
    }))
  );
}

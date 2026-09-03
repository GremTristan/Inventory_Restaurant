import type { InventoryItem } from "@/types";
import { foldSearch } from "@/lib/menu-taxonomy";

export type StockFamily =
  | "fromages"
  | "charcuterie"
  | "viandes"
  | "poissons"
  | "oeufs"
  | "legumes"
  | "fruits"
  | "laitiers"
  | "farines"
  | "sucres"
  | "epices"
  | "conserves"
  | "surgeles"
  | "boissons"
  | "entretien"
  | "autres";

export const STOCK_FAMILY_LABELS: Record<StockFamily, string> = {
  fromages: "Fromages",
  charcuterie: "Charcuterie",
  viandes: "Viandes",
  poissons: "Poissons / fumés",
  oeufs: "Œufs",
  legumes: "Légumes",
  fruits: "Fruits",
  laitiers: "Crèmes et lait",
  farines: "Farines / pâtes",
  sucres: "Sucré / confiserie",
  epices: "Épices et condiments",
  conserves: "Conserves",
  surgeles: "Surgelés",
  boissons: "Boissons",
  entretien: "Entretien",
  autres: "Autres",
};

export const STOCK_FAMILY_ORDER: StockFamily[] = [
  "fromages",
  "charcuterie",
  "viandes",
  "poissons",
  "oeufs",
  "legumes",
  "fruits",
  "laitiers",
  "farines",
  "sucres",
  "epices",
  "conserves",
  "surgeles",
  "boissons",
  "entretien",
  "autres",
];

function hasAny(haystack: string, needles: string[]): boolean {
  return needles.some((n) => haystack.includes(n));
}

export function stockFamily(item: Pick<InventoryItem, "name" | "category">): StockFamily {
  const n = foldSearch(item.name);
  if (item.category === "boissons" || hasAny(n, ["cidre", "vin ", "biere", "jus ", "cola", "sprite", "eau ", "valser"])) {
    return "boissons";
  }
  if (hasAny(n, ["fromage", "gruyere", "chevre", "mozzarella", "parmesan", "emmental", "comte", "bufflonne"])) return "fromages";
  if (hasAny(n, ["jambon", "lardon", "chorizo", "saucisse", "bacon", "bresaola", "parme", "magret"])) return "charcuterie";
  if (hasAny(n, ["poulet", "boeuf", "veau", "canard", "viande"])) return "viandes";
  if (hasAny(n, ["saumon", "poisson", "thon", "crevette"])) return "poissons";
  if (hasAny(n, ["oeuf", "œuf"])) return "oeufs";
  if (hasAny(n, ["tomate", "salade", "concombre", "oignon", "carotte", "champignon", "epinard", "chou", "olive", "pomme de terre", "courgette"])) {
    return "legumes";
  }
  if (hasAny(n, ["pomme fruit", "banane", "citron", "orange", "fraise", "fruit"])) return "fruits";
  if (hasAny(n, ["creme", "lait", "beurre", "yaourt"])) return "laitiers";
  if (hasAny(n, ["farine", "sarrasin", "ble noir", "pate"])) return "farines";
  if (hasAny(n, ["sucre", "nutella", "caramel", "chocolat", "miel", "confiture"])) return "sucres";
  if (hasAny(n, ["sel", "poivre", "epice", "huile", "vinaigre", "moutarde", "basilic"])) return "epices";
  if (hasAny(n, ["conserve", "boite"])) return "conserves";
  if (hasAny(n, ["surgele", "frozen"])) return "surgeles";
  if (hasAny(n, ["savon", "javel", "lessive", "papier"])) return "entretien";
  if (item.category === "sucre") return "sucres";
  if (item.category === "viande") return "viandes";
  return "autres";
}

export function matchesStockQuery(
  item: Pick<InventoryItem, "name">,
  query: string
): boolean {
  const q = foldSearch(query);
  if (!q) return true;
  return foldSearch(item.name).includes(q);
}

export function groupStockByFamily<T extends Pick<InventoryItem, "name" | "category">>(items: T[]): { family: StockFamily; label: string; items: T[] }[] {
  const buckets = new Map<StockFamily, T[]>();
  for (const item of items) {
    const family = stockFamily(item);
    const list = buckets.get(family) ?? [];
    list.push(item);
    buckets.set(family, list);
  }
  return STOCK_FAMILY_ORDER.filter((f) => buckets.has(f)).map((family) => ({
    family,
    label: STOCK_FAMILY_LABELS[family],
    items: buckets.get(family)!,
  }));
}

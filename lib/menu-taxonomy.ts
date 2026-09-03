import type { MenuItem } from "@/types";

export type MenuFamily =
  | "salades"
  | "galettes"
  | "crepes"
  | "glaces"
  | "chaud"
  | "soft"
  | "cidres"
  | "vins"
  | "bieres"
  | "cocktails"
  | "autres";

export const MENU_FAMILY_LABELS: Record<MenuFamily, string> = {
  salades: "Salades",
  galettes: "Galettes",
  crepes: "Crêpes",
  glaces: "Glaces",
  chaud: "Chauds",
  soft: "Sans alcool",
  cidres: "Cidres",
  vins: "Vins",
  bieres: "Bières",
  cocktails: "Cocktails",
  autres: "Autres",
};

export const MENU_FAMILY_ORDER: MenuFamily[] = [
  "galettes",
  "salades",
  "crepes",
  "glaces",
  "chaud",
  "soft",
  "cidres",
  "vins",
  "bieres",
  "cocktails",
  "autres",
];

export function foldSearch(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

function hasAny(haystack: string, needles: string[]): boolean {
  return needles.some((n) => haystack.includes(n));
}

export function menuFamily(item: Pick<MenuItem, "name" | "category">): MenuFamily {
  const n = foldSearch(item.name);

  if (hasAny(n, ["salade"])) return "salades";
  if (hasAny(n, ["glace", "sorbet"])) return "glaces";

  if (item.category === "boisson") {
    if (hasAny(n, ["cidre"])) return "cidres";
    if (hasAny(n, ["vin ", "chasselas", "prosecco"])) return "vins";
    if (hasAny(n, ["biere", "pression", "duchesse"])) return "bieres";
    if (hasAny(n, ["aperol", "hugo", "spritz"])) return "cocktails";
    if (hasAny(n, ["the froid", "limonade", "coca", "fanta", "sprite", "valser", "jus "])) return "soft";
    if (
      hasAny(n, ["cafe", "espresso", "cappuccino", "chocolat", "thes", "eilles", "renverse", "lait chaud", "lait froid", "viennois"])
    ) {
      return "chaud";
    }
    return "soft";
  }

  if (item.category === "sucree") return "crepes";
  if (item.category === "salee") return "galettes";
  return "autres";
}

export function matchesQuery(name: string, query: string): boolean {
  const q = foldSearch(query);
  if (!q) return true;
  return foldSearch(name).includes(q);
}

export function familiesPresent(items: Pick<MenuItem, "name" | "category">[]): MenuFamily[] {
  const seen = new Set(items.map(menuFamily));
  return MENU_FAMILY_ORDER.filter((f) => seen.has(f));
}

export function groupMenuByFamily<T extends Pick<MenuItem, "name" | "category">>(items: T[]): { family: MenuFamily; label: string; items: T[] }[] {
  const buckets = new Map<MenuFamily, T[]>();
  for (const item of items) {
    const family = menuFamily(item);
    const list = buckets.get(family) ?? [];
    list.push(item);
    buckets.set(family, list);
  }
  return MENU_FAMILY_ORDER.filter((f) => buckets.has(f)).map((family) => ({
    family,
    label: MENU_FAMILY_LABELS[family],
    items: buckets.get(family)!,
  }));
}

export function menuFamilyFromName(name: string): MenuFamily {
  const n = foldSearch(name);
  if (hasAny(n, ["salade"])) return menuFamily({ name, category: "salee" });
  if (hasAny(n, ["glace", "sorbet", "nutella", "caramel", "sucre", "citron", "banane", "chocolat"])) {
    return menuFamily({ name, category: "sucree" });
  }
  if (
    hasAny(n, [
      "cafe",
      "the",
      "cidre",
      "vin",
      "biere",
      "coca",
      "jus",
      "prosecco",
      "aperol",
      "valser",
      "lait",
      "chocolat chaud",
    ])
  ) {
    return menuFamily({ name, category: "boisson" });
  }
  return menuFamily({ name, category: "salee" });
}

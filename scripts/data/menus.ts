// Cartes imprimées des 4 crêperies (BDF, Molard, Philosophes, Vieux-Carouge).
// Extraite des PDF du directeur ; consommée par scripts/seed-creperies-group.ts.
// Les noms d'ingrédients restent tels qu'imprimés pour matcher l'inventaire Molard.

export type MenuItemKind = "galette_salee" | "crepe_sucree" | "boisson" | "glace" | "salade";

export interface SourceMenuItem {
  name: string;
  price: number;
  kind: MenuItemKind;
  // Recipe ingredients — omitted for items with no fixed composition (most
  // drinks, the "galette nue" base, à-la-carte ice cream scoops).
  ingredients?: string[];
}

export interface SourceMenu {
  siteSlug: string;
  items: SourceMenuItem[];
}

// Ingredients shared by every site's "composez votre galette" à-la-carte
// list (3.50 CHF tier) — not modeled as MenuItems themselves (they're
// priced per-ingredient, not per-dish), but every InventoryItem name here
// should exist in each site's inventory since a customer can order any of
// them on a custom galette. Recorded here only as documentation for anyone
// reconciling inventory names against the menu — the import script does
// not consume this constant.

// --- BDF (Crêperie du Bourg de Four) ---
const bdf: SourceMenuItem[] = [
  // Boissons du moment
  { name: "Thés Eilles", price: 5.0, kind: "boisson" },
  { name: "Café", price: 4.3, kind: "boisson" },
  { name: "Double espresso", price: 5.6, kind: "boisson" },
  { name: "Cappuccino", price: 6.2, kind: "boisson" },
  { name: "Café Viennois", price: 6.5, kind: "boisson" },
  { name: "Renversé", price: 5.6, kind: "boisson" },
  { name: "Chocolat chaud artisanal", price: 6.5, kind: "boisson" },
  { name: "Chocolat viennois", price: 6.5, kind: "boisson" },
  { name: "Lait chaud ou froid", price: 4.0, kind: "boisson" },
  { name: "Valser 5dl", price: 6.0, kind: "boisson" },
  { name: "Coca-Cola", price: 5.3, kind: "boisson" },
  { name: "Fanta ou Sprite", price: 5.3, kind: "boisson" },
  { name: "Thé froid pêche ou citron", price: 5.3, kind: "boisson" },
  { name: "Limonade au gingembre bio", price: 5.3, kind: "boisson" },
  { name: "Cidre Sorre brut bolée", price: 6.0, kind: "boisson", ingredients: ["Cidre Sorre Brut"] },
  { name: "Cidre Sorre doux bolée", price: 6.0, kind: "boisson", ingredients: ["Cidre Sorre Doux"] },
  { name: "Cidre RHUYS brut", price: 7.0, kind: "boisson", ingredients: ["Cidre Rhuys"] },
  { name: "Prosecco flûte", price: 8.0, kind: "boisson" },
  { name: "Aperol Spritz", price: 12.0, kind: "boisson" },
  { name: "Hugo", price: 12.0, kind: "boisson" },
  { name: "Bière pression blonde 3dl", price: 6.0, kind: "boisson" },
  { name: "Duchesse Anne", price: 8.5, kind: "boisson" },
  { name: "Chasselas", price: 7.0, kind: "boisson", ingredients: ["Vin blanc Chasselas"] },
  { name: "Jus d'oranges fraîchement pressées", price: 7.0, kind: "boisson" },
  { name: "Jus de pommes artisanal médaillé", price: 5.5, kind: "boisson" },

  // Salades
  { name: "Petite salade verte", price: 6.5, kind: "salade" },
  { name: "Petite salade mixte", price: 9.5, kind: "salade" },
  {
    name: "Salade Fitness",
    price: 25.0,
    kind: "salade",
    ingredients: ["Tomates cerise confites", "Concombre", "Chou rouge", "Carottes râpées", "Filet de poulet", "Oignons crus"],
  },
  {
    name: "Salade de chèvre chaud",
    price: 25.0,
    kind: "salade",
    ingredients: ["Fromage de chèvre", "Confit d'oignons", "Pomme fruit", "Magret de canard", "Noix"],
  },
  {
    name: "Salade Océane",
    price: 26.5,
    kind: "salade",
    ingredients: ["Saumon fumé", "Concombre", "Câpres", "Tomates", "Oignons crus", "Crème acidulée"],
  },
  {
    name: "Salade Italienne",
    price: 26.5,
    kind: "salade",
    ingredients: ["Mozzarella de bufflonne", "Tomates", "Olives", "Jambon de Parme", "Parmesan"],
  },

  // Galettes signature
  {
    name: "Complète jambon ou chorizo",
    price: 20.0,
    kind: "galette_salee",
    ingredients: ["Gruyère AOP", "Œuf", "Jambon", "Chorizo"],
  },
  { name: "Jambon Gruyère AOP", price: 18.0, kind: "galette_salee", ingredients: ["Jambon", "Gruyère AOP"] },
  {
    name: "Jambon, Gruyère AOP et champignons",
    price: 20.0,
    kind: "galette_salee",
    ingredients: ["Jambon", "Gruyère AOP", "Champignons"],
  },
  {
    name: "Jambon, Gruyère AOP et épinards",
    price: 20.0,
    kind: "galette_salee",
    ingredients: ["Jambon", "Gruyère AOP", "Épinards"],
  },
  {
    name: "Bergère",
    price: 24.5,
    kind: "galette_salee",
    ingredients: ["Fromage de chèvre", "Miel", "Noix", "Pomme fruit"],
  },
  {
    name: "Italienne",
    price: 25.9,
    kind: "galette_salee",
    ingredients: ["Mozzarella", "Jambon de Parme", "Bresaola", "Sauce tomate au basilic", "Parmesan"],
  },
  {
    name: "Forestière",
    price: 24.9,
    kind: "galette_salee",
    ingredients: ["Champignons", "Gruyère AOP", "Lardons", "Oignons crus"],
  },
  {
    name: "Breizh",
    price: 22.9,
    kind: "galette_salee",
    ingredients: ["Gruyère AOP", "Œuf", "Lardons", "Crème", "Oignons confits"],
  },
  {
    name: "Végétarienne",
    price: 23.0,
    kind: "galette_salee",
    ingredients: ["Mozzarella", "Sauce tomate au basilic", "Épinards", "Champignons"],
  },
  {
    name: "Genevoise",
    price: 24.9,
    kind: "galette_salee",
    ingredients: ["Tomme genevoise", "Jambon genevois", "Épinards"],
  },
  { name: "Popeye", price: 20.0, kind: "galette_salee", ingredients: ["Gruyère AOP", "Épinards", "Œuf"] },
  {
    name: "Saumon",
    price: 25.9,
    kind: "galette_salee",
    ingredients: ["Saumon fumé", "Câpres", "Crème acidulée", "Oignons crus"],
  },
  {
    name: "Gstaader",
    price: 26.9,
    kind: "galette_salee",
    ingredients: ["Fromage à raclette", "Jambon cru", "Cornichons", "Oignons crus", "Crème"],
  },

  // Crêpes sucrées
  { name: "Compote de pommes maison et amandes", price: 14.5, kind: "crepe_sucree", ingredients: ["Compote de pommes"] },
  { name: "Caramel au beurre salé artisanal", price: 12.5, kind: "crepe_sucree" },
  { name: "Miel", price: 9.0, kind: "crepe_sucree", ingredients: ["Miel"] },
  { name: "Miel et noix", price: 12.0, kind: "crepe_sucree", ingredients: ["Miel", "Noix"] },
  { name: "Crème de marrons", price: 12.0, kind: "crepe_sucree" },
  { name: "Sirop d'érable", price: 12.0, kind: "crepe_sucree" },
  { name: "Confitures", price: 9.0, kind: "crepe_sucree" },
  { name: "Sucre", price: 6.0, kind: "crepe_sucree", ingredients: ["Sucre"] },
  { name: "Beurre sucre", price: 7.0, kind: "crepe_sucree", ingredients: ["Beurre", "Sucre"] },
  { name: "Nutella", price: 11.9, kind: "crepe_sucree", ingredients: ["Nutella"] },
  { name: "Nutella banane", price: 14.0, kind: "crepe_sucree", ingredients: ["Nutella"] },
  { name: "Chocolat artisanal", price: 12.5, kind: "crepe_sucree" },
  {
    name: "Normande",
    price: 18.5,
    kind: "crepe_sucree",
    ingredients: ["Compote de pommes", "Amandes grillées", "Caramel au beurre salé"],
  },
  { name: "Belle Hélène", price: 17.5, kind: "crepe_sucree", ingredients: ["Poire", "Chocolat artisanal"] },
  {
    name: "La Suzette de Bourg de Four",
    price: 18.5,
    kind: "crepe_sucree",
    ingredients: ["Zestes d'oranges", "Grand Marnier"],
  },
  { name: "Kinder Surprise", price: 13.9, kind: "crepe_sucree" },

  // Glaces
  { name: "1 boule", price: 4.0, kind: "glace" },
  { name: "2 boules", price: 7.9, kind: "glace" },
  { name: "3 boules", price: 10.5, kind: "glace" },
  { name: "Chocolat Glacé", price: 13.0, kind: "glace", ingredients: ["Glace Chocolat", "Glace Stracciatella"] },
  { name: "Mocca glacé", price: 13.0, kind: "glace", ingredients: ["Glace Mocca"] },
  { name: "Coupe Dulcinea", price: 13.0, kind: "glace", ingredients: ["Glace Vanille"] },
  { name: "Coupe Danemark", price: 13.0, kind: "glace", ingredients: ["Glace Vanille"] },
  { name: "Coupe Smiley", price: 4.0, kind: "glace" },
];

// --- Molard (Crêperie du Molard) ---
const molard: SourceMenuItem[] = [
  { name: "Thés Eilles", price: 5.5, kind: "boisson" },
  { name: "Café", price: 4.3, kind: "boisson" },
  { name: "Double espresso", price: 5.6, kind: "boisson" },
  { name: "Cappuccino", price: 6.2, kind: "boisson" },
  { name: "Café Viennois", price: 6.5, kind: "boisson" },
  { name: "Renversé", price: 5.6, kind: "boisson" },
  { name: "Chocolat chaud", price: 5.6, kind: "boisson" },
  { name: "Chocolat grand mère", price: 7.0, kind: "boisson" },
  { name: "Chocolat viennois", price: 6.5, kind: "boisson" },
  { name: "Lait chaud ou froid", price: 4.0, kind: "boisson" },
  { name: "Valser 5dl", price: 6.0, kind: "boisson" },
  { name: "Coca-Cola", price: 5.3, kind: "boisson" },
  { name: "Fanta ou Sprite", price: 5.3, kind: "boisson" },
  { name: "Rivella rouge ou bleu", price: 5.3, kind: "boisson" },
  { name: "Thé froid pêche ou citron", price: 5.3, kind: "boisson" },
  { name: "Cidre Sorre brut bolée", price: 6.2, kind: "boisson", ingredients: ["Cidre Sorre Brut"] },
  { name: "Cidre Sorre doux bolée", price: 6.2, kind: "boisson", ingredients: ["Cidre Sorre Doux"] },
  { name: "Cidre RHUYS brut", price: 14.0, kind: "boisson", ingredients: ["Cidre Rhuys"] },
  { name: "Aperol Spritz", price: 13.5, kind: "boisson" },
  { name: "Prosecco flûte", price: 8.0, kind: "boisson" },
  { name: "Bière pression blonde 3dl", price: 5.5, kind: "boisson" },
  { name: "Duchesse Anne", price: 8.5, kind: "boisson" },
  { name: "Jus de pomme artisanal médaillé", price: 5.3, kind: "boisson" },
  { name: "Nectars ananas ou abricot", price: 5.0, kind: "boisson" },
  { name: "Jus d'oranges", price: 5.0, kind: "boisson" },

  { name: "Petite salade verte", price: 6.5, kind: "salade" },
  { name: "Petite salade mixte", price: 7.9, kind: "salade" },
  {
    name: "Salade Fitness",
    price: 24.5,
    kind: "salade",
    ingredients: ["Tomates cerise confites", "Concombre", "Chou rouge", "Carottes râpées", "Filet de poulet"],
  },
  {
    name: "Salade de chèvre chaud",
    price: 24.5,
    kind: "salade",
    ingredients: ["Fromage de chèvre", "Confit d'oignons", "Oignons confits"],
  },
  {
    name: "Salade Océane",
    price: 25.9,
    kind: "salade",
    ingredients: ["Saumon fumé", "Concombre", "Câpres", "Tomate", "Crème acidulée"],
  },

  {
    name: "Complète jambon ou chorizo",
    price: 19.5,
    kind: "galette_salee",
    ingredients: ["Gruyère AOP", "Œuf", "Jambon", "Chorizo"],
  },
  { name: "Jambon Gruyère AOP", price: 16.5, kind: "galette_salee", ingredients: ["Jambon", "Gruyère AOP"] },
  {
    name: "Jambon, Gruyère AOP et champignons",
    price: 19.5,
    kind: "galette_salee",
    ingredients: ["Jambon", "Gruyère AOP", "Champignons"],
  },
  {
    name: "Jambon, Gruyère AOP et épinards",
    price: 19.5,
    kind: "galette_salee",
    ingredients: ["Jambon", "Gruyère AOP", "Épinards"],
  },
  {
    name: "Bergère",
    price: 25.5,
    kind: "galette_salee",
    ingredients: ["Fromage de chèvre", "Miel", "Noix", "Roquette"],
  },
  {
    name: "Italienne",
    price: 26.5,
    kind: "galette_salee",
    ingredients: ["Mozzarella", "Jambon de Parme", "Salade", "Sauce tomate au basilic", "Parmesan"],
  },
  {
    name: "Forestière",
    price: 25.5,
    kind: "galette_salee",
    ingredients: ["Champignons", "Gruyère AOP", "Lardons", "Oignons crus"],
  },
  {
    name: "Breizh",
    price: 23.5,
    kind: "galette_salee",
    ingredients: ["Gruyère AOP", "Œuf", "Lardons", "Crème", "Oignons confits"],
  },
  {
    name: "Végétarienne",
    price: 23.5,
    kind: "galette_salee",
    ingredients: ["Mozzarella", "Champignons", "Épinards", "Sauce tomate au basilic"],
  },
  {
    name: "Genevoise",
    price: 25.5,
    kind: "galette_salee",
    ingredients: ["Saucisse", "Gruyère AOP", "Tomme genevoise", "Oignons confits", "Cornichons"],
  },
  { name: "Popeye", price: 20.0, kind: "galette_salee", ingredients: ["Gruyère AOP", "Épinards", "Œuf"] },
  {
    name: "Saumon",
    price: 25.5,
    kind: "galette_salee",
    ingredients: ["Saumon fumé", "Câpres", "Crème acidulée", "Oignons crus"],
  },
  {
    name: "Pesto",
    price: 24.9,
    kind: "galette_salee",
    ingredients: ["Émincé de poulet", "Mozzarella", "Tomates cerises confites"],
  },

  { name: "Compote de pommes maison et amandes", price: 13.5, kind: "crepe_sucree" },
  { name: "Nutella", price: 11.0, kind: "crepe_sucree", ingredients: ["Nutella"] },
  { name: "Chocolat artisanal", price: 11.0, kind: "crepe_sucree" },
  { name: "Miel", price: 10.0, kind: "crepe_sucree", ingredients: ["Miel"] },
  { name: "Sucre", price: 9.0, kind: "crepe_sucree", ingredients: ["Sucre"] },
  { name: "Beurre sucre", price: 7.0, kind: "crepe_sucree", ingredients: ["Beurre", "Sucre"] },
  {
    name: "Normande",
    price: 18.9,
    kind: "crepe_sucree",
    ingredients: ["Pommes caramélisées", "Amandes grillées", "Caramel au beurre salé"],
  },
  { name: "Belle Hélène", price: 18.9, kind: "crepe_sucree", ingredients: ["Poire", "Chocolat artisanal"] },
  { name: "Bounty", price: 17.9, kind: "crepe_sucree", ingredients: ["Noix de coco râpée", "Chocolat artisanal"] },
  { name: "La Suzette du Molard", price: 19.0, kind: "crepe_sucree", ingredients: ["Zestes d'oranges", "Grand Marnier"] },

  { name: "1 boule", price: 4.2, kind: "glace" },
  { name: "2 boules", price: 8.2, kind: "glace" },
  { name: "3 boules", price: 10.5, kind: "glace" },
  { name: "Chocolat Glacé", price: 13.0, kind: "glace", ingredients: ["Glace Chocolat", "Glace Stracciatella"] },
  { name: "Mocca glacé", price: 13.0, kind: "glace", ingredients: ["Glace Mocca"] },
  { name: "Dulcinea", price: 13.0, kind: "glace", ingredients: ["Glace Vanille"] },
  { name: "Mont Blanc", price: 13.0, kind: "glace", ingredients: ["Glace Vanille"] },
  { name: "Frappé", price: 9.0, kind: "glace" },
  { name: "Coupe Smiley", price: 4.2, kind: "glace" },
];

// --- Philosophes (Crêperie des Philosophes) ---
const philosophe: SourceMenuItem[] = [
  { name: "Café", price: 3.9, kind: "boisson" },
  { name: "Double espresso", price: 5.6, kind: "boisson" },
  { name: "Cappuccino", price: 4.9, kind: "boisson" },
  { name: "Renversé", price: 4.3, kind: "boisson" },
  { name: "Café viennois", price: 5.5, kind: "boisson" },
  { name: "Chocolat chaud ou froid", price: 4.9, kind: "boisson" },
  { name: "Chocolat viennois", price: 5.9, kind: "boisson" },
  { name: "Lait chaud ou froid", price: 3.5, kind: "boisson" },
  { name: "Thés Eilles", price: 4.9, kind: "boisson" },
  { name: "Valser", price: 3.0, kind: "boisson" },
  { name: "Jus de pommes artisanal médaillé", price: 4.7, kind: "boisson" },
  { name: "Coca-Cola", price: 4.9, kind: "boisson" },
  { name: "Fanta ou Sprite", price: 4.9, kind: "boisson" },
  { name: "Rivella rouge ou bleu", price: 4.9, kind: "boisson" },
  { name: "Cidre Sorre brut bolée", price: 6.2, kind: "boisson", ingredients: ["Cidre Sorre Brut"] },
  { name: "Cidre Sorre doux bolée", price: 6.2, kind: "boisson", ingredients: ["Cidre Sorre Doux"] },
  { name: "Prosecco flûte", price: 7.5, kind: "boisson" },
  { name: "Aperol Spritz", price: 12.0, kind: "boisson" },
  { name: "Bière pression blonde 3dl", price: 4.9, kind: "boisson" },
  { name: "Duchesse Anne", price: 7.9, kind: "boisson" },

  { name: "Petite salade verte", price: 5.5, kind: "salade" },
  { name: "Petite salade mixte", price: 7.5, kind: "salade" },
  {
    name: "Salade de chèvre chaud",
    price: 22.0,
    kind: "salade",
    ingredients: ["Fromage de chèvre", "Confit d'oignons", "Pomme fruit", "Magret de canard fumé", "Noix"],
  },
  {
    name: "Salade Fitness",
    price: 22.0,
    kind: "salade",
    ingredients: ["Filet de poulet", "Mozzarella de bufflonne"],
  },
  {
    name: "Salade Italienne",
    price: 22.0,
    kind: "salade",
    ingredients: ["Mozzarella de bufflonne", "Tomates", "Olives", "Jambon de Parme", "Bresaola", "Parmesan"],
  },

  {
    name: "Complète jambon ou chorizo",
    price: 17.5,
    kind: "galette_salee",
    ingredients: ["Gruyère AOP", "Œuf", "Jambon", "Chorizo"],
  },
  { name: "Jambon Gruyère AOP", price: 14.9, kind: "galette_salee", ingredients: ["Jambon", "Gruyère AOP"] },
  {
    name: "Jambon, Gruyère AOP et champignons",
    price: 17.5,
    kind: "galette_salee",
    ingredients: ["Jambon", "Gruyère AOP", "Champignons"],
  },
  {
    name: "Jambon, Gruyère AOP et épinards nature",
    price: 17.5,
    kind: "galette_salee",
    ingredients: ["Jambon", "Gruyère AOP", "Épinards nature"],
  },
  {
    name: "Bergère",
    price: 21.5,
    kind: "galette_salee",
    ingredients: ["Fromage de chèvre", "Miel", "Noix", "Pomme fruit"],
  },
  {
    name: "Italienne",
    price: 21.5,
    kind: "galette_salee",
    ingredients: ["Mozzarella", "Sauce tomate au basilic", "Jambon de Parme", "Bresaola", "Parmesan"],
  },
  {
    name: "Forestière",
    price: 21.5,
    kind: "galette_salee",
    ingredients: ["Champignons", "Gruyère AOP", "Lardons", "Oignons crus"],
  },
  {
    name: "Breizh",
    price: 21.0,
    kind: "galette_salee",
    ingredients: ["Gruyère AOP", "Œuf", "Lardons", "Crème", "Oignons confits"],
  },
  {
    name: "Végétarienne",
    price: 21.5,
    kind: "galette_salee",
    ingredients: ["Mozzarella", "Sauce tomate au basilic", "Aubergines", "Poivrons", "Épinards", "Champignons"],
  },
  {
    name: "Terroir",
    price: 21.5,
    kind: "galette_salee",
    ingredients: ["Tomme vaudoise", "Fondue de poireaux", "Saucisson vaudois"],
  },
  { name: "Popeye", price: 17.5, kind: "galette_salee", ingredients: ["Gruyère AOP", "Épinards", "Œuf"] },
  {
    name: "Saumon",
    price: 21.5,
    kind: "galette_salee",
    ingredients: ["Saumon fumé", "Câpres", "Crème acidulée", "Oignons crus"],
  },
  {
    name: "Mexicaine",
    price: 21.5,
    kind: "galette_salee",
    ingredients: ["Poulet mariné", "Poivrons", "Sauce salsa", "Crème acidulée", "Oignons crus"],
  },
  {
    name: "Américaine",
    price: 21.5,
    kind: "galette_salee",
    ingredients: ["Bœuf haché", "Confit d'oignons", "Œuf"],
  },

  { name: "Pommes caramélisées, amandes et caramel", price: 14.0, kind: "crepe_sucree" },
  { name: "Caramel au beurre salé artisanal", price: 12.0, kind: "crepe_sucree" },
  { name: "Sirop d'érable", price: 11.0, kind: "crepe_sucree" },
  { name: "Crème de marrons", price: 11.0, kind: "crepe_sucree" },
  { name: "Miel", price: 9.0, kind: "crepe_sucree", ingredients: ["Miel"] },
  { name: "Miel et noix", price: 11.0, kind: "crepe_sucree", ingredients: ["Miel", "Noix"] },
  { name: "Confitures", price: 9.0, kind: "crepe_sucree" },
  { name: "Sucre", price: 4.9, kind: "crepe_sucree", ingredients: ["Sucre"] },
  { name: "Beurre sucre", price: 7.0, kind: "crepe_sucree", ingredients: ["Beurre", "Sucre"] },
  { name: "Nutella", price: 11.0, kind: "crepe_sucree", ingredients: ["Nutella"] },
  { name: "Chocolat artisanal", price: 12.0, kind: "crepe_sucree" },
  {
    name: "Normande",
    price: 19.0,
    kind: "crepe_sucree",
    ingredients: ["Pommes caramélisées", "Amandes grillées", "Caramel au beurre salé"],
  },
  { name: "Belle Hélène", price: 18.0, kind: "crepe_sucree", ingredients: ["Poire", "Chocolat artisanal"] },
  { name: "Bounty", price: 18.0, kind: "crepe_sucree", ingredients: ["Noix de coco râpée", "Chocolat artisanal"] },
  { name: "Grand Marnier et marmelade d'oranges", price: 18.0, kind: "crepe_sucree" },
  { name: "Kinder Surprise", price: 12.0, kind: "crepe_sucree" },

  { name: "1 boule", price: 4.0, kind: "glace" },
  { name: "2 boules", price: 7.9, kind: "glace" },
  { name: "3 boules", price: 10.5, kind: "glace" },
  { name: "Chocolat Glacé", price: 13.0, kind: "glace", ingredients: ["Glace Chocolat", "Glace Stracciatella"] },
  { name: "Mocca glacé", price: 13.0, kind: "glace", ingredients: ["Glace Mocca"] },
  { name: "Dulcinea", price: 13.0, kind: "glace", ingredients: ["Glace Vanille"] },
  { name: "Frappé", price: 9.0, kind: "glace" },
  { name: "Coupe Smiley", price: 4.0, kind: "glace" },
];

// --- Vieux Carouge (Crêperie du Vieux Carouge) ---
const carouge: SourceMenuItem[] = [
  { name: "Café", price: 4.3, kind: "boisson" },
  { name: "Double espresso", price: 5.9, kind: "boisson" },
  { name: "Cappuccino", price: 5.5, kind: "boisson" },
  { name: "Renversé", price: 5.0, kind: "boisson" },
  { name: "Café viennois", price: 6.0, kind: "boisson" },
  { name: "Chocolat chaud ou froid", price: 4.9, kind: "boisson" },
  { name: "Chocolat chaud ou froid artisanal", price: 6.5, kind: "boisson" },
  { name: "Chocolat viennois", price: 6.5, kind: "boisson" },
  { name: "Lait chaud ou froid", price: 4.0, kind: "boisson" },
  { name: "Thés Eilles", price: 5.0, kind: "boisson" },
  { name: "Valser 5dl", price: 6.0, kind: "boisson" },
  { name: "Jus de pommes artisanal médaillé", price: 5.0, kind: "boisson" },
  { name: "Coca-Cola", price: 5.0, kind: "boisson" },
  { name: "Fanta ou Sprite", price: 5.0, kind: "boisson" },
  { name: "Rivella rouge ou bleu", price: 5.0, kind: "boisson" },
  { name: "Cidre Sorre brut bolée", price: 6.0, kind: "boisson", ingredients: ["Cidre Sorre Brut"] },
  { name: "Cidre Sorre doux bolée", price: 6.0, kind: "boisson", ingredients: ["Cidre Sorre Doux"] },
  { name: "Cidre RHUYS brut bolée", price: 7.0, kind: "boisson", ingredients: ["Cidre Rhuys"] },
  { name: "Flûte de Prosecco", price: 7.5, kind: "boisson" },
  { name: "Aperol Spritz", price: 12.0, kind: "boisson" },
  { name: "Bière pression blonde 3dl", price: 5.0, kind: "boisson" },
  { name: "Duchesse Anne", price: 8.0, kind: "boisson" },

  { name: "Petite salade verte", price: 6.5, kind: "salade" },
  { name: "Petite salade mixte", price: 9.5, kind: "salade" },
  {
    name: "Salade de chèvre chaud",
    price: 24.5,
    kind: "salade",
    ingredients: ["Fromage de chèvre", "Confit d'oignons", "Tomates cerise confites", "Lardons", "Noix"],
  },
  {
    name: "Salade Fitness",
    price: 24.0,
    kind: "salade",
    ingredients: ["Filet de poulet", "Oignons rouges", "Tomates cerise confites", "Concombre", "Chou rouge", "Carottes râpées"],
  },
  {
    name: "Salade Italienne",
    price: 24.5,
    kind: "salade",
    ingredients: ["Mozzarella de bufflonne", "Tomates", "Olives", "Jambon de Parme", "Parmesan"],
  },

  {
    name: "Complète jambon ou chorizo",
    price: 19.5,
    kind: "galette_salee",
    ingredients: ["Gruyère AOP", "Œuf", "Jambon", "Chorizo"],
  },
  { name: "Jambon Gruyère AOP", price: 16.5, kind: "galette_salee", ingredients: ["Jambon", "Gruyère AOP"] },
  {
    name: "Jambon, Gruyère AOP et champignons",
    price: 19.5,
    kind: "galette_salee",
    ingredients: ["Jambon", "Gruyère AOP", "Champignons"],
  },
  {
    name: "Jambon, Gruyère AOP et épinards",
    price: 19.5,
    kind: "galette_salee",
    ingredients: ["Jambon", "Gruyère AOP", "Épinards"],
  },
  {
    name: "Bergère",
    price: 24.0,
    kind: "galette_salee",
    ingredients: ["Fromage de chèvre", "Miel", "Noix", "Pomme fruit"],
  },
  {
    name: "Italienne",
    price: 25.0,
    kind: "galette_salee",
    ingredients: ["Mozzarella", "Sauce tomate au basilic", "Jambon de Parme", "Parmesan"],
  },
  {
    name: "Forestière",
    price: 24.9,
    kind: "galette_salee",
    ingredients: ["Champignons", "Gruyère AOP", "Lardons", "Oignons crus"],
  },
  {
    name: "Breizh",
    price: 22.9,
    kind: "galette_salee",
    ingredients: ["Gruyère AOP", "Œuf", "Lardons", "Crème", "Oignons confits"],
  },
  {
    name: "Végétarienne",
    price: 23.5,
    kind: "galette_salee",
    ingredients: ["Mozzarella", "Sauce tomate au basilic", "Champignons"],
  },
  {
    name: "Carougeoise",
    price: 22.5,
    kind: "galette_salee",
    ingredients: ["Saucisse", "Gruyère AOP", "Tomme genevoise", "Oignons confits", "Cornichons"],
  },
  { name: "Popeye", price: 19.5, kind: "galette_salee", ingredients: ["Gruyère AOP", "Épinards", "Œuf"] },
  {
    name: "Saumon",
    price: 24.9,
    kind: "galette_salee",
    ingredients: ["Saumon fumé", "Câpres", "Crème acidulée", "Oignons crus"],
  },
  {
    name: "Gstaader",
    price: 23.5,
    kind: "galette_salee",
    ingredients: ["Fromage à raclette", "Jambon de Parme", "Cornichons", "Oignons crus"],
  },
  {
    name: "Poulette",
    price: 23.9,
    kind: "galette_salee",
    ingredients: ["Émincé de poulet", "Gruyère AOP", "Œuf", "Champignons", "Crème"],
  },

  { name: "Pommes caramélisées, amandes et caramel", price: 14.5, kind: "crepe_sucree" },
  { name: "Caramel au beurre salé artisanal", price: 12.5, kind: "crepe_sucree" },
  { name: "Sirop d'érable", price: 12.0, kind: "crepe_sucree" },
  { name: "Crème de marrons", price: 12.0, kind: "crepe_sucree" },
  { name: "Miel", price: 9.0, kind: "crepe_sucree", ingredients: ["Miel"] },
  { name: "Miel et noix", price: 12.0, kind: "crepe_sucree", ingredients: ["Miel", "Noix"] },
  { name: "Confitures", price: 9.0, kind: "crepe_sucree" },
  { name: "Sucre", price: 6.0, kind: "crepe_sucree", ingredients: ["Sucre"] },
  { name: "Beurre sucre", price: 7.0, kind: "crepe_sucree", ingredients: ["Beurre", "Sucre"] },
  { name: "Nutella", price: 11.0, kind: "crepe_sucree", ingredients: ["Nutella"] },
  { name: "Chocolat artisanal", price: 11.9, kind: "crepe_sucree" },
  {
    name: "Normande",
    price: 18.5,
    kind: "crepe_sucree",
    ingredients: ["Pommes caramélisées", "Amandes grillées", "Caramel au beurre salé"],
  },
  { name: "Belle Hélène", price: 17.5, kind: "crepe_sucree", ingredients: ["Poire", "Chocolat artisanal"] },
  { name: "Bounty", price: 17.5, kind: "crepe_sucree", ingredients: ["Noix de coco râpée", "Chocolat artisanal"] },
  { name: "La Suzette de Carouge", price: 18.5, kind: "crepe_sucree", ingredients: ["Zestes d'oranges", "Grand Marnier"] },

  { name: "1 boule", price: 4.0, kind: "glace" },
  { name: "2 boules", price: 7.9, kind: "glace" },
  { name: "3 boules", price: 10.5, kind: "glace" },
  { name: "Chocolat Glacé", price: 13.0, kind: "glace", ingredients: ["Glace Chocolat", "Glace Stracciatella"] },
  { name: "Mocca glacé", price: 13.0, kind: "glace", ingredients: ["Glace Mocca"] },
  { name: "Dulcinea", price: 13.0, kind: "glace", ingredients: ["Glace Vanille"] },
  { name: "Mont Blanc", price: 13.0, kind: "glace", ingredients: ["Glace Vanille"] },
  { name: "Frappé", price: 9.0, kind: "glace" },
  { name: "Pirulo tropical", price: 2.5, kind: "glace" },
  { name: "Coupe Smiley", price: 4.0, kind: "glace" },
];

export const menus: SourceMenu[] = [
  { siteSlug: "bdf", items: bdf },
  { siteSlug: "molard", items: molard },
  { siteSlug: "philosophe", items: philosophe },
  { siteSlug: "carouge", items: carouge },
];

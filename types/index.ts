export type Role = "manager" | "director" | "waiter";

export const ROLE_LABELS: Record<Role, string> = {
  manager: "Chef crêpier",
  director: "Directeur",
  waiter: "Serveur",
};

export type SiteId = "bdf" | "carouge" | "molard" | "vevey" | "philosophe" | "hoshy";

export interface Site {
  id: SiteId;
  name: string;
}

export interface User {
  id: string;
  name: string;
  role: Role;
  // Only set for managers; directors can access every site.
  siteId: SiteId | null;
}

// Server-only shape carrying the hashed PIN. Never returned to a Client
// Component — lib/user-store.ts strips passwordHash before returning a
// User to any UI-facing caller. Kept as a separate type (rather than an
// optional field on User) so a stray `user` prop passed to a "use client"
// component can never accidentally leak the hash through serialization.
export interface AuthUser extends User {
  passwordHash: string;
}

export interface Supplier {
  id: string;
  name: string;
}

export type Category = "frais" | "sec" | "sucre" | "viande" | "boissons";

export const CATEGORY_LABELS: Record<Category, string> = {
  frais: "Produits frais",
  sec: "Produits secs",
  sucre: "Produits sucrés",
  viande: "Viande",
  boissons: "Boissons",
};

// Fixed display order (not alphabetical): mirrors a physical stockroom
// walk-through — chilled goods first (most perishable), then dry, sweet,
// meat, drinks.
export const CATEGORY_ORDER: Category[] = ["frais", "sec", "sucre", "viande", "boissons"];

// Category color identity: a small dot + left-border accent only — the
// table body itself always stays neutral. Mid-saturated tones chosen to
// carry real weight on a white background (the previous dark-theme shades
// read as too pale here), while staying mutually distinguishable and clear
// of the app's own accent blue (#007aff), which sits closer to violet than
// any of these five hues.
export const CATEGORY_COLORS: Record<Category, { dot: string; border: string }> = {
  frais: { dot: "bg-sky-500", border: "border-sky-500" },
  sec: { dot: "bg-amber-500", border: "border-amber-500" },
  sucre: { dot: "bg-pink-500", border: "border-pink-500" },
  viande: { dot: "bg-rose-600", border: "border-rose-600" },
  boissons: { dot: "bg-teal-600", border: "border-teal-600" },
};

// Physical area an article is stocked in — separate axis from Category
// (which classifies by product type). Drives the director's Cuisine/Salle
// inventory tabs.
export type Zone = "cuisine" | "salle";

export const ZONE_LABELS: Record<Zone, string> = {
  cuisine: "Cuisine",
  salle: "Salle",
};

export interface InventoryItem {
  id: string;
  siteId: SiteId;
  name: string;
  zone: Zone;
  // Label for the purchasing unit tracked by `quantity` (e.g. "pack",
  // "douzaine", "kg", "bouteille") — always the unit actually counted in
  // stock, never a sub-unit like "œuf" or "L" when the item is bought
  // packaged.
  unit: string;
  // How many base sub-units (eggs, liters, grams…) one `unit` contains.
  // 1 for items whose unit already is the base sub-unit (kg, L, bouteille).
  unitsPerPackage: number;
  // Label for the base sub-unit unitsPerPackage counts, shown alongside the
  // derived total (e.g. "œufs", "L"). Omitted when unitsPerPackage is 1.
  packageContentLabel?: string;
  quantity: number;
  unitPrice: number;
  supplierId: string | null;
  visibleToManager: boolean;
  visibleToServer: boolean;
  category: Category;
}

// Derived shape used once quantity * unitPrice has been computed.
export interface InventoryItemWithValue extends InventoryItem {
  stockValue: number;
}

export interface SiteInventoryValue {
  siteId: SiteId;
  siteName: string;
  totalValue: number;
  itemCount: number;
}

// Sellable product (crêpe, drink…) tracked in the daily sales entry —
// distinct from InventoryItem, which tracks stock ingredients, not menu
// items. Scoped per site: each établissement has its own crêpes/drinks, so
// menus are never shared across sites, managed by the director per site.
export interface MenuItem {
  id: string;
  siteId: SiteId;
  name: string;
}

// One record per (siteId, date) — upserted, so a same-day resubmission
// replaces rather than duplicates.
export interface DailySalesEntry {
  id: string;
  siteId: SiteId;
  date: string; // "YYYY-MM-DD"
  // Card payments only.
  cardRevenue: number;
  // Total revenue, all payment methods combined. Cash is always derived as
  // netRevenue - cardRevenue at display time, never stored — netRevenue is
  // guaranteed >= cardRevenue (validated server-side) so it's never negative.
  netRevenue: number;
  // menuItemId -> quantity sold. May contain ids for menu items that were
  // later deleted; callers should skip unknown ids when rendering rather
  // than treat them as an error.
  quantities: Record<string, number>;
  recordedByUserId: string;
  recordedAt: string; // ISO timestamp
}

// Structured data pulled from a photographed till receipt by the vision
// model — used only to prefill daily-sales-form.tsx's inputs before
// submission, never written to a DailySalesEntry directly. `items` carries
// already-resolved menu item ids (matching against the site's menu happens
// server-side in lib/sales-extraction-actions.ts) rather than raw product
// name strings, so the client never redoes that matching.
export interface ExtractedSalesData {
  cardRevenue: number | null;
  netRevenue: number | null;
  items: { menuItemId: string; quantity: number }[];
  // Ticket lines the model returned that couldn't be matched to any menu
  // item name for this site. Always populated (never dropped server-side)
  // even though the UI surfaces it as a quiet, non-alarming note.
  unmatchedCount: number;
}

// A photo submitted to the AI avatar chat, plus the AI's own summary of it.
// Persisted (not ephemeral) so a director can later ask the avatar to
// reference past tickets across sessions — see lib/ai-avatar-store.ts. The
// conversation text around it is NOT persisted (see AvatarChatMessage);
// only the receipt + its AI summary survive a page refresh.
export interface ReceiptRecord {
  id: string;
  siteId: SiteId;
  submittedByUserId: string;
  submittedAt: string; // ISO timestamp
  // Relative path under data/receipts/, e.g. "bdf/<uuid>.jpg" — never
  // absolute (keeps the store portable) and never raw bytes.
  imagePath: string;
  imageMediaType: "image/jpeg" | "image/png" | "image/webp" | "image/gif";
  aiSummary: string;
}

// One turn in an avatar conversation — used only for in-memory client
// state (conversation history is ephemeral, never persisted), but declared
// centrally since both the widget and the server action need the identical
// shape for request/response typing.
export interface AvatarChatMessage {
  role: "user" | "assistant";
  text: string;
}

export type ReminderKind = "daily-sales" | "monthly-inventory";

// Presence of a record means the task for that (siteId, kind, period) is
// done. Completion is always an explicit action — either a direct "Marquer
// comme fait" click, or (for daily-sales only) a side effect of submitting
// the day's sales form — never inferred from unrelated data changes.
export interface ReminderCompletion {
  id: string;
  siteId: SiteId;
  kind: ReminderKind;
  period: string; // "YYYY-MM-DD" for daily-sales, "YYYY-MM" for monthly-inventory
  completedAt: string; // ISO timestamp
  completedByUserId: string;
}

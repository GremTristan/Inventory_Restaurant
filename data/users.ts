import type { Role, SiteId } from "@/types";

// Seed directory, consumed by lib/user-store.ts on first run (same pattern
// as initialInventory/initialMenu). `defaultPin` is hashed once by the
// store when it seeds data/user-config.json — never stored in clear text
// anywhere after that first write.
export interface SeedUser {
  id: string;
  name: string;
  role: Role;
  siteId: SiteId | null;
  defaultPin: string;
}

export const initialUsers: SeedUser[] = [
  { id: "manager-bdf", name: "Alice Dubois", role: "manager", siteId: "bdf", defaultPin: "1234" },
  { id: "manager-carouge", name: "Marc Fontaine", role: "manager", siteId: "carouge", defaultPin: "1234" },
  { id: "manager-molard", name: "Sophie Berger", role: "manager", siteId: "molard", defaultPin: "1234" },
  { id: "manager-vevey", name: "Julien Rey", role: "manager", siteId: "vevey", defaultPin: "1234" },
  { id: "manager-philosophe", name: "Camille Bovet", role: "manager", siteId: "philosophe", defaultPin: "1234" },
  { id: "manager-hoshy", name: "Thomas Gay", role: "manager", siteId: "hoshy", defaultPin: "1234" },
  { id: "waiter-bdf", name: "Léa Moreau", role: "waiter", siteId: "bdf", defaultPin: "1234" },
  { id: "waiter-carouge", name: "Nabil Haddad", role: "waiter", siteId: "carouge", defaultPin: "1234" },
  { id: "waiter-molard", name: "Chloé Rossier", role: "waiter", siteId: "molard", defaultPin: "1234" },
  { id: "waiter-vevey", name: "Hugo Currat", role: "waiter", siteId: "vevey", defaultPin: "1234" },
  { id: "waiter-philosophe", name: "Inès Zbinden", role: "waiter", siteId: "philosophe", defaultPin: "1234" },
  { id: "waiter-hoshy", name: "Maxime Ducret", role: "waiter", siteId: "hoshy", defaultPin: "1234" },
  { id: "director-1", name: "Julien Perret", role: "director", siteId: null, defaultPin: "1234" },
];

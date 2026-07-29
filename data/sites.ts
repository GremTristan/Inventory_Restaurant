import type { Site } from "@/types";

export const sites: Site[] = [
  { id: "bdf", name: "BDF" },
  { id: "carouge", name: "Carouge" },
  { id: "molard", name: "Molard" },
  { id: "vevey", name: "Vevey" },
  { id: "philosophe", name: "Philosophe" },
  { id: "hoshy", name: "Hoshy" },
];

export function getSiteById(siteId: string): Site | undefined {
  return sites.find((site) => site.id === siteId);
}

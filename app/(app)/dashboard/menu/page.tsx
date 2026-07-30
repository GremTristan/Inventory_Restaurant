import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/session";
import { getMenuItems } from "@/lib/sales-store";
import { sites } from "@/data/sites";
import { MenuManager } from "@/components/menu-manager";
import { Section } from "@/components/ui/section";
import type { MenuItem, SiteId } from "@/types";

export default async function MenuPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (user.role !== "director") redirect(`/inventory/${user.siteId}`);

  const menuBySite = Object.fromEntries(
    await Promise.all(sites.map(async (site) => [site.id, await getMenuItems(site.id)] as const))
  ) as Record<SiteId, MenuItem[]>;

  return (
    <>
      <h1 className="text-2xl font-bold text-foreground sm:text-3xl">Menu</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Gérez la liste des produits vendables par établissement, utilisée dans la saisie quotidienne des ventes.
      </p>

      <div className="mt-6">
        <Section title="Liste des produits" description="Ajoutez, renommez ou supprimez un produit du menu de chaque établissement.">
          <MenuManager sites={sites} menuBySite={menuBySite} />
        </Section>
      </div>
    </>
  );
}

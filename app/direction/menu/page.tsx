import type { Metadata } from "next";
import { Copy } from "lucide-react";
import { ActionButton, CreateForm } from "@/components/direction/forms";
import { MenuDirectory } from "@/components/direction/menu-directory";
import { EmptyState, PageHeader, SiteTabs } from "@/components/direction/ui";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { addMenuItemAction, propagateMenuAction } from "@/lib/direction-actions";
import { canUse } from "@/lib/billing/plans";
import { getInventoryBySite } from "@/lib/inventory-store";
import { getIngredientsForMenuItems, getMenuItems } from "@/lib/menu-store";
import { pageDirector } from "@/lib/page-guards";
import { getSitesForTenant } from "@/lib/site-store";
import { MENU_CATEGORY_LABELS, MENU_CATEGORY_ORDER } from "@/types";

export const metadata: Metadata = { title: "Menu" };

export default async function MenuPage({ searchParams }: { searchParams: Promise<{ site?: string }> }) {
  const { site: siteParam } = await searchParams;
  const { tenant } = await pageDirector();
  const sites = (await getSitesForTenant(tenant.id)).filter((s) => s.active);
  const site = sites.find((s) => s.id === siteParam) ?? sites[0];
  if (!site) return <EmptyState title="Créez d’abord un établissement" />;

  const [menu, inventory] = await Promise.all([getMenuItems(site.id), getInventoryBySite(site.id)]);
  const ingredients = await getIngredientsForMenuItems(menu.map((m) => m.id));
  const recipesEnabled = canUse(tenant, "recipes");

  return (
    <>
      <PageHeader
        title="Menu"
        description="Produits, prix, disponibilité et recettes. « Copier cette carte » propage aussi les recettes vers les autres établissements (par nom d’article de stock)."
        action={
          sites.length > 1 ? (
            <ActionButton
              action={propagateMenuAction}
              fields={{ siteId: site.id }}
              message="Carte copiée vers les autres établissements"
              variant="secondary"
            >
              <Copy className="h-4 w-4" /> Copier cette carte vers les autres établissements
            </ActionButton>
          ) : undefined
        }
      />
      <SiteTabs sites={sites} current={site.id} basePath="/direction/menu" />

      <section className="mb-8 rounded-lg border border-border bg-card p-4">
        <h2 className="mb-3 text-base font-bold text-foreground">Ajouter un produit</h2>
        <CreateForm action={addMenuItemAction} submitLabel="Ajouter" className="grid gap-3 sm:grid-cols-[1fr_8rem_10rem_auto] sm:items-end">
          <input type="hidden" name="siteId" value={site.id} />
          <label className="block text-sm font-medium">
            Nom
            <Input name="name" required placeholder="Complète" className="mt-1 min-h-11" />
          </label>
          <label className="block text-sm font-medium">
            Prix ({tenant.currency})
            <Input name="price" type="number" step="0.10" min="0" required placeholder="14.00" className="mt-1 min-h-11" />
          </label>
          <label className="block text-sm font-medium">
            Catégorie
            <Select name="category" defaultValue="salee" className="mt-1 min-h-11 w-full">
              {MENU_CATEGORY_ORDER.map((c) => (
                <option key={c} value={c}>
                  {MENU_CATEGORY_LABELS[c]}
                </option>
              ))}
            </Select>
          </label>
        </CreateForm>
      </section>

      {menu.length === 0 ? (
        <EmptyState title="La carte est vide" description="Ajoutez vos crêpes et boissons ci-dessus : elles apparaissent aussitôt sur les tablettes." />
      ) : (
        <MenuDirectory menu={menu} inventory={inventory} ingredients={ingredients} recipesEnabled={recipesEnabled} />
      )}
    </>
  );
}

import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/session";
import { getAllInventoryItems, getSuppliers } from "@/lib/inventory-store";
import { SupplierManager } from "@/components/supplier-manager";
import { SupplierAssignmentTable } from "@/components/supplier-assignment-table";
import { InventoryItemForm } from "@/components/inventory-item-form";
import { Section } from "@/components/ui/section";

export default async function SuppliersPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (user.role !== "director") redirect(`/inventory/${user.siteId}`);

  const suppliers = getSuppliers();
  const items = getAllInventoryItems();

  return (
    <>
      <h1 className="text-2xl font-bold text-foreground sm:text-3xl">Fournisseurs</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Gérez la liste des fournisseurs et assignez-en un à chaque article, site par site.
      </p>

      <div className="mt-6 flex flex-col gap-6">
        <Section title="Liste des fournisseurs" description="Ajoutez, renommez ou supprimez un fournisseur.">
          <SupplierManager suppliers={suppliers} />
        </Section>

        <Section title="Ajouter un article" description="Crée un nouvel article d'inventaire pour un site.">
          <InventoryItemForm />
        </Section>

        <Section title="Assignation par article" description="Associe chaque article à son fournisseur.">
          <SupplierAssignmentTable items={items} suppliers={suppliers} />
        </Section>
      </div>
    </>
  );
}

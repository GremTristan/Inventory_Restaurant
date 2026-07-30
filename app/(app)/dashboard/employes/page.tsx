import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/session";
import { getAllUsers } from "@/lib/user-store";
import { sites } from "@/data/sites";
import { EmployeeManager } from "@/components/employee-manager";
import { Section } from "@/components/ui/section";

export default async function EmployeesPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (user.role !== "director") redirect(`/inventory/${user.siteId}`);

  const employees = getAllUsers().filter((employee) => employee.role !== "director");

  return (
    <>
      <h1 className="text-2xl font-bold text-foreground sm:text-3xl">Employés</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Gérez les comptes des chefs crêpiers et serveurs par établissement, ainsi que leur code PIN de connexion.
      </p>

      <div className="mt-6">
        <Section title="Comptes employés" description="Ajoutez, renommez, supprimez un employé ou changez son code PIN.">
          <EmployeeManager sites={sites} employees={employees} />
        </Section>
      </div>
    </>
  );
}

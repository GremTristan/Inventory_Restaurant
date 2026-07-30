"use client";

import { useState } from "react";
import { ROLE_LABELS, type Role, type Site, type User } from "@/types";
import {
  changeEmployeePinAction,
  createEmployeeAction,
  deleteEmployeeAction,
  renameEmployeeAction,
} from "@/lib/employee-actions";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Button } from "@/components/ui/button";

const EMPLOYEE_ROLES: Role[] = ["manager", "waiter"];

export function EmployeeManager({ sites, employees }: { sites: Site[]; employees: User[] }) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingPasswordId, setEditingPasswordId] = useState<string | null>(null);

  return (
    <div className="flex flex-col gap-6">
      {sites.map((site) => {
        const siteEmployees = employees.filter((employee) => employee.siteId === site.id);
        return (
          <div key={site.id}>
            <h3 className="text-sm font-bold text-foreground">{site.name}</h3>
            <ul className="mt-2 flex flex-col gap-2">
              {siteEmployees.map((employee) =>
                editingId === employee.id ? (
                  <li key={employee.id} className="flex items-center gap-2 rounded-card bg-muted/40 px-4 py-3">
                    <form
                      action={async (formData) => {
                        await renameEmployeeAction(formData);
                        setEditingId(null);
                      }}
                      className="flex flex-1 items-center gap-2"
                    >
                      <input type="hidden" name="id" value={employee.id} />
                      <Input name="name" defaultValue={employee.name} className="flex-1" autoFocus />
                      <Button type="submit" variant="secondary" size="sm">
                        Enregistrer
                      </Button>
                    </form>
                    <Button type="button" variant="ghost" size="sm" onClick={() => setEditingId(null)}>
                      Annuler
                    </Button>
                  </li>
                ) : editingPasswordId === employee.id ? (
                  <li key={employee.id} className="flex items-center gap-2 rounded-card bg-muted/40 px-4 py-3">
                    <span className="text-sm font-medium text-foreground">{employee.name}</span>
                    <form
                      action={async (formData) => {
                        await changeEmployeePinAction(formData);
                        setEditingPasswordId(null);
                      }}
                      className="flex flex-1 items-center gap-2"
                    >
                      <input type="hidden" name="id" value={employee.id} />
                      <Input
                        name="pin"
                        type="text"
                        inputMode="numeric"
                        maxLength={4}
                        placeholder="Nouveau PIN"
                        className="flex-1"
                        autoFocus
                        required
                      />
                      <Button type="submit" variant="secondary" size="sm">
                        Enregistrer
                      </Button>
                    </form>
                    <Button type="button" variant="ghost" size="sm" onClick={() => setEditingPasswordId(null)}>
                      Annuler
                    </Button>
                  </li>
                ) : (
                  <li
                    key={employee.id}
                    className="flex items-center justify-between rounded-card bg-muted/40 px-4 py-3.5"
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-foreground">{employee.name}</span>
                      <span className="text-xs text-muted-foreground">{ROLE_LABELS[employee.role]}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Button type="button" variant="ghost" size="sm" onClick={() => setEditingId(employee.id)}>
                        Renommer
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => setEditingPasswordId(employee.id)}
                      >
                        Changer le PIN
                      </Button>
                      <form action={deleteEmployeeAction}>
                        <input type="hidden" name="id" value={employee.id} />
                        <Button type="submit" variant="destructive" size="sm">
                          Supprimer
                        </Button>
                      </form>
                    </div>
                  </li>
                )
              )}
              {siteEmployees.length === 0 && (
                <li className="px-1 py-3 text-sm text-muted-foreground">Aucun employé pour le moment.</li>
              )}
            </ul>
          </div>
        );
      })}

      <div className="rounded-card bg-muted/60 p-4 sm:p-6">
        <h3 className="text-sm font-bold text-foreground">Ajouter un employé</h3>
        <form action={createEmployeeAction} className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Input name="name" placeholder="Nom" required />
          <Select name="role" defaultValue="waiter" required>
            {EMPLOYEE_ROLES.map((role) => (
              <option key={role} value={role}>
                {ROLE_LABELS[role]}
              </option>
            ))}
          </Select>
          <Select name="siteId" defaultValue={sites[0]?.id} required>
            {sites.map((site) => (
              <option key={site.id} value={site.id}>
                {site.name}
              </option>
            ))}
          </Select>
          <Input
            name="pin"
            type="text"
            inputMode="numeric"
            maxLength={4}
            placeholder="PIN initial (4 chiffres)"
            required
          />
          <Button type="submit" variant="primary" size="sm" className="sm:col-span-2 lg:col-span-4">
            Ajouter
          </Button>
        </form>
      </div>
    </div>
  );
}

"use client";

import { useState } from "react";
import type { MenuItem, Site, SiteId } from "@/types";
import {
  createMenuItemAction,
  deleteMenuItemAction,
  renameMenuItemAction,
} from "@/lib/menu-actions";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Button } from "@/components/ui/button";

export function MenuManager({ sites, menuBySite }: { sites: Site[]; menuBySite: Record<SiteId, MenuItem[]> }) {
  const [siteId, setSiteId] = useState<SiteId>(sites[0]?.id);
  const [editingId, setEditingId] = useState<string | null>(null);
  const menu = menuBySite[siteId] ?? [];

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-2">
        <label className="text-xs font-medium text-muted-foreground" htmlFor="menu-site-selector">
          Établissement
        </label>
        <Select
          id="menu-site-selector"
          value={siteId}
          onChange={(e) => {
            setSiteId(e.target.value as SiteId);
            setEditingId(null);
          }}
        >
          {sites.map((site) => (
            <option key={site.id} value={site.id}>
              {site.name}
            </option>
          ))}
        </Select>
      </div>

      <ul className="flex flex-col gap-2">
        {menu.map((item) =>
          editingId === item.id ? (
            <li key={item.id} className="flex items-center gap-2 rounded-card bg-muted/40 px-4 py-3">
              <form
                action={async (formData) => {
                  await renameMenuItemAction(formData);
                  setEditingId(null);
                }}
                className="flex flex-1 items-center gap-2"
              >
                <input type="hidden" name="id" value={item.id} />
                <Input name="name" defaultValue={item.name} className="flex-1" autoFocus />
                <Button type="submit" variant="secondary" size="sm">
                  Enregistrer
                </Button>
              </form>
              <Button type="button" variant="ghost" size="sm" onClick={() => setEditingId(null)}>
                Annuler
              </Button>
            </li>
          ) : (
            <li key={item.id} className="flex items-center justify-between rounded-card bg-muted/40 px-4 py-3.5">
              <span className="text-sm font-medium text-foreground">{item.name}</span>
              <div className="flex items-center gap-1">
                <Button type="button" variant="ghost" size="sm" onClick={() => setEditingId(item.id)}>
                  Renommer
                </Button>
                <form action={deleteMenuItemAction}>
                  <input type="hidden" name="id" value={item.id} />
                  <Button type="submit" variant="destructive" size="sm">
                    Supprimer
                  </Button>
                </form>
              </div>
            </li>
          )
        )}
        {menu.length === 0 && (
          <li className="px-1 py-3 text-sm text-muted-foreground">Aucun produit pour le moment.</li>
        )}
      </ul>
      <form action={createMenuItemAction} className="flex items-center gap-2 rounded-card bg-muted/60 px-4 py-3">
        <input type="hidden" name="siteId" value={siteId} />
        <Input name="name" placeholder="Nouveau produit" className="flex-1" required />
        <Button type="submit" variant="primary" size="sm">
          Ajouter
        </Button>
      </form>
    </div>
  );
}

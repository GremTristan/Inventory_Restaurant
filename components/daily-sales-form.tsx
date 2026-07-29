"use client";

import { useState } from "react";
import type { DailySalesEntry, MenuItem, SiteId } from "@/types";
import { recordDailySalesAction } from "@/lib/sales-actions";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Table, TableCell, TableHead, TableHeaderRow, TableRow } from "@/components/ui/table";

export function DailySalesForm({
  siteId,
  menu,
  existingEntry,
}: {
  siteId: SiteId;
  menu: MenuItem[];
  existingEntry?: DailySalesEntry;
}) {
  // If today's entry already exists (page reloaded, or came back later),
  // start on the confirmation state rather than reopening the form.
  const [submitted, setSubmitted] = useState(Boolean(existingEntry));
  // Only tracked for the live "Espèces" preview below — the form itself
  // stays uncontrolled for submission, matching the rest of this file.
  const [cardRevenue, setCardRevenue] = useState(existingEntry?.cardRevenue ?? 0);
  const [netRevenue, setNetRevenue] = useState(existingEntry?.netRevenue ?? 0);
  const cashRevenue = Math.max(0, netRevenue - cardRevenue);

  if (submitted) {
    return (
      <div className="flex flex-col items-start gap-3 rounded-md border border-border bg-muted px-4 py-6 text-center sm:text-left">
        <p className="text-sm font-medium text-foreground">
          Merci d&apos;avoir rempli les informations. À demain.
        </p>
        <Button
          type="button"
          variant="ghost"
          className="px-0 text-xs text-accent hover:text-accent-hover"
          onClick={() => setSubmitted(false)}
        >
          Modifier ma saisie
        </Button>
      </div>
    );
  }

  return (
    <form
      action={async (formData) => {
        await recordDailySalesAction(formData);
        setSubmitted(true);
      }}
      className="flex flex-col gap-4"
    >
      <input type="hidden" name="siteId" value={siteId} />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div>
          <label className="mb-1 block text-xs font-medium text-muted-foreground">Montant CB</label>
          <div className="flex items-center gap-1">
            <span className="text-muted-foreground">CHF</span>
            <Input
              name="cardRevenue"
              type="number"
              min={0}
              step="0.05"
              defaultValue={existingEntry?.cardRevenue ?? 0}
              onChange={(e) => setCardRevenue(e.target.valueAsNumber || 0)}
              required
            />
          </div>
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-muted-foreground">
            Chiffre d&apos;affaires net
          </label>
          <div className="flex items-center gap-1">
            <span className="text-muted-foreground">CHF</span>
            <Input
              name="netRevenue"
              type="number"
              min={0}
              step="0.05"
              defaultValue={existingEntry?.netRevenue ?? 0}
              onChange={(e) => setNetRevenue(e.target.valueAsNumber || 0)}
              required
            />
          </div>
        </div>
        <div>
          <span className="mb-1 block text-xs font-medium text-muted-foreground">Espèces</span>
          <p className="rounded-md border border-transparent px-3 py-1.5 text-sm tabular-nums text-foreground">
            {cashRevenue.toFixed(2)} CHF
          </p>
        </div>
      </div>

      <Table>
        <thead>
          <TableHeaderRow>
            <TableHead>Produit</TableHead>
            <TableHead>Quantité vendue</TableHead>
          </TableHeaderRow>
        </thead>
        <tbody>
          {menu.map((item) => (
            <TableRow key={item.id}>
              <TableCell className="font-medium text-foreground">{item.name}</TableCell>
              <TableCell>
                <Input
                  name={`quantities[${item.id}]`}
                  type="number"
                  min={0}
                  step="1"
                  defaultValue={existingEntry?.quantities[item.id] ?? 0}
                  className="w-24 tabular-nums"
                />
              </TableCell>
            </TableRow>
          ))}
          {menu.length === 0 && (
            <tr>
              <TableCell colSpan={2} className="py-3 text-sm text-muted-foreground">
                Aucun produit dans le menu pour le moment.
              </TableCell>
            </tr>
          )}
        </tbody>
      </Table>

      <div className="flex items-center gap-3">
        <Button type="submit" variant="primary" className="px-4 py-2 text-sm">
          {existingEntry ? "Mettre à jour la journée" : "Valider la journée"}
        </Button>
      </div>
    </form>
  );
}

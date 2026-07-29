"use client";

import { useActionState, useRef, useState } from "react";
import type { DailySalesEntry, MenuItem, SiteId } from "@/types";
import { recordDailySalesAction } from "@/lib/sales-actions";
import { extractSalesFromReceiptAction, type ExtractionResult } from "@/lib/sales-extraction-actions";
import { compressImage } from "@/lib/image-compression";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Table, TableCell, TableHead, TableHeaderRow, TableRow } from "@/components/ui/table";

const initialExtractionState: ExtractionResult = { available: true };

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

  // Single source of truth for prefillable values — feeds both the cash
  // preview computation and (via key-remount below) the form inputs'
  // defaultValue. Replaced wholesale on a successful AI extraction rather
  // than patched field-by-field, keeping "what's currently in the form" a
  // single object with a single update path.
  const [values, setValues] = useState({
    cardRevenue: existingEntry?.cardRevenue ?? 0,
    netRevenue: existingEntry?.netRevenue ?? 0,
    quantities: existingEntry?.quantities ?? ({} as Record<string, number>),
  });
  // Bumped after a successful extraction to force the sales-submission
  // form's uncontrolled inputs (defaultValue-driven) to remount and re-read
  // their defaultValue from the new `values` — the one deliberate escape
  // hatch from React's usual "don't use key to reset state" caution, chosen
  // because it's the least invasive way to push new defaults into inputs
  // that are uncontrolled by design (matches the rest of this form).
  const [formKey, setFormKey] = useState(0);
  const cashRevenue = Math.max(0, values.netRevenue - values.cardRevenue);

  const [unmatchedCount, setUnmatchedCount] = useState<number | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const extractionFormRef = useRef<HTMLFormElement>(null);
  const [isCompressing, setIsCompressing] = useState(false);

  const [extractionState, extractionFormAction, isExtracting] = useActionState(
    async (_prev: ExtractionResult, formData: FormData) => {
      const result = await extractSalesFromReceiptAction(formData);
      if (result.available && result.data) {
        const nextQuantities: Record<string, number> = { ...values.quantities };
        for (const { menuItemId, quantity } of result.data.items) {
          nextQuantities[menuItemId] = quantity;
        }
        setValues({
          cardRevenue: result.data.cardRevenue ?? values.cardRevenue,
          netRevenue: result.data.netRevenue ?? values.netRevenue,
          quantities: nextQuantities,
        });
        setUnmatchedCount(result.data.unmatchedCount);
        setFormKey((k) => k + 1);
      }
      return result;
    },
    initialExtractionState
  );

  async function handlePhotoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const original = e.target.files?.[0];
    if (!original) return;
    setIsCompressing(true);
    const compressed = await compressImage(original);
    setIsCompressing(false);
    // Swap the input's file list for the compressed version so the form's
    // native FormData submission carries the smaller file, not the original.
    const transfer = new DataTransfer();
    transfer.items.add(compressed);
    if (fileInputRef.current) {
      fileInputRef.current.files = transfer.files;
    }
    // Auto-submit the extraction form once compression finishes — the
    // waiter already chose "fill from photo" and picked a file; no extra
    // click needed. Submitting THIS form only ever runs
    // extractSalesFromReceiptAction, never recordDailySalesAction — the two
    // are separate <form> elements below, so the photo input can never leak
    // into the sales-submission FormData.
    extractionFormRef.current?.requestSubmit();
  }

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
    <div className="flex flex-col gap-4">
      <form
        ref={extractionFormRef}
        action={extractionFormAction}
        className="flex flex-col gap-2 rounded-md border border-dashed border-border bg-muted/40 p-3"
      >
        <input type="hidden" name="siteId" value={siteId} />
        <input
          ref={fileInputRef}
          type="file"
          name="image"
          accept="image/*"
          capture="environment"
          className="hidden"
          onChange={handlePhotoChange}
        />
        <div className="flex items-center gap-3">
          <Button
            type="button"
            variant="secondary"
            className="text-xs"
            onClick={() => fileInputRef.current?.click()}
            disabled={isCompressing || isExtracting}
          >
            📷 Remplir depuis une photo
          </Button>
          {isCompressing && (
            <span className="text-xs text-muted-foreground">Compression de la photo…</span>
          )}
          {isExtracting && (
            <span className="text-xs text-muted-foreground">
              Lecture du ticket… (peut prendre jusqu&apos;à une minute)
            </span>
          )}
        </div>
        {extractionState.error && <p className="text-xs text-destructive">{extractionState.error}</p>}
        {unmatchedCount !== null && unmatchedCount > 0 && (
          <p className="text-xs text-muted-foreground">
            {unmatchedCount} ligne{unmatchedCount > 1 ? "s" : ""} du ticket n&apos;
            {unmatchedCount > 1 ? "ont" : "a"} pas pu être associée{unmatchedCount > 1 ? "s" : ""} à un
            produit du menu — vérifiez et ajoutez-les manuellement si besoin.
          </p>
        )}
      </form>

      <form
        key={formKey}
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
                defaultValue={values.cardRevenue}
                onChange={(e) =>
                  setValues((v) => ({ ...v, cardRevenue: e.target.valueAsNumber || 0 }))
                }
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
                defaultValue={values.netRevenue}
                onChange={(e) =>
                  setValues((v) => ({ ...v, netRevenue: e.target.valueAsNumber || 0 }))
                }
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
                    defaultValue={values.quantities[item.id] ?? 0}
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
    </div>
  );
}

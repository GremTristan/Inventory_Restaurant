"use client";

import { useActionState, useCallback, useEffect, useRef, useState } from "react";
import type { DailySalesEntry, ExtractedSalesData, MenuItem, SiteId } from "@/types";
import { recordDailySalesAction } from "@/lib/sales-actions";
import { extractSalesFromReceiptAction, type ExtractionResult } from "@/lib/sales-extraction-actions";
import { compressImage } from "@/lib/image-compression";
import { useSalesFormBridge } from "@/lib/sales-form-bridge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { TableCell, TableHead, TableHeaderRow, TableRow } from "@/components/ui/table";
import { ResponsiveDataList } from "@/components/ui/responsive-data-list";

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

  // Single mutation path for "apply extracted receipt data to the form" —
  // called both by the button flow below and by the avatar widget via the
  // registerTarget bridge, so the two never diverge.
  const applyExtractedData = useCallback(
    (data: ExtractedSalesData) => {
      const nextQuantities: Record<string, number> = { ...values.quantities };
      for (const { menuItemId, quantity } of data.items) {
        nextQuantities[menuItemId] = quantity;
      }
      setValues({
        cardRevenue: data.cardRevenue ?? values.cardRevenue,
        netRevenue: data.netRevenue ?? values.netRevenue,
        quantities: nextQuantities,
      });
      setUnmatchedCount(data.unmatchedCount);
      setFormKey((k) => k + 1);
    },
    [values]
  );

  const { registerTarget } = useSalesFormBridge();
  useEffect(() => {
    return registerTarget(siteId, applyExtractedData);
  }, [siteId, registerTarget, applyExtractedData]);

  const [extractionState, extractionFormAction, isExtracting] = useActionState(
    async (_prev: ExtractionResult, formData: FormData) => {
      const result = await extractSalesFromReceiptAction(formData);
      if (result.available && result.data) {
        applyExtractedData(result.data);
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
      <div className="flex flex-col items-start gap-3 rounded-card bg-muted/60 px-4 py-6 text-center sm:text-left">
        <p className="text-sm font-medium text-foreground">
          Merci d&apos;avoir rempli les informations. À demain.
        </p>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="px-0 text-accent hover:text-accent-hover"
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
        className="flex flex-col gap-2 rounded-card border border-dashed border-border bg-muted/40 p-4"
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
            size="lg"
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

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <div className="rounded-card bg-muted/60 p-4">
            <label className="text-xs font-semibold text-muted-foreground">Montant CB</label>
            <div className="mt-1 flex items-baseline gap-1">
              <span className="text-lg font-bold text-muted-foreground">CHF</span>
              <input
                name="cardRevenue"
                type="number"
                min={0}
                step="0.05"
                defaultValue={values.cardRevenue}
                onChange={(e) =>
                  setValues((v) => ({ ...v, cardRevenue: e.target.valueAsNumber || 0 }))
                }
                required
                className="w-full min-w-0 bg-transparent text-2xl font-bold tabular-nums text-metric-card-payment focus:outline-none"
              />
            </div>
          </div>
          <div className="rounded-card bg-muted/60 p-4">
            <label className="text-xs font-semibold text-muted-foreground">Chiffre d&apos;affaires net</label>
            <div className="mt-1 flex items-baseline gap-1">
              <span className="text-lg font-bold text-muted-foreground">CHF</span>
              <input
                name="netRevenue"
                type="number"
                min={0}
                step="0.05"
                defaultValue={values.netRevenue}
                onChange={(e) =>
                  setValues((v) => ({ ...v, netRevenue: e.target.valueAsNumber || 0 }))
                }
                required
                className="w-full min-w-0 bg-transparent text-2xl font-bold tabular-nums text-foreground focus:outline-none"
              />
            </div>
          </div>
          <div className="rounded-card bg-muted/60 p-4">
            <span className="text-xs font-semibold text-muted-foreground">Espèces</span>
            <p className="mt-1 text-2xl font-bold tabular-nums text-metric-cash-payment">
              {cashRevenue.toFixed(2)} <span className="text-lg">CHF</span>
            </p>
          </div>
        </div>

        <ResponsiveDataList
          items={menu}
          getKey={(item) => item.id}
          tableHead={
            <TableHeaderRow>
              <TableHead>Produit</TableHead>
              <TableHead>Quantité vendue</TableHead>
            </TableHeaderRow>
          }
          renderRow={(item) => (
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
          )}
          renderCard={(item) => (
            <div className="flex items-center justify-between rounded-card bg-card p-4 shadow-[0_1px_2px_rgba(20,24,27,0.04),0_8px_24px_-8px_rgba(20,24,27,0.08)]">
              <p className="text-sm font-semibold text-foreground">{item.name}</p>
              <Input
                name={`quantities[${item.id}]`}
                type="number"
                min={0}
                step="1"
                defaultValue={values.quantities[item.id] ?? 0}
                className="w-20 text-center tabular-nums"
              />
            </div>
          )}
        />
        {menu.length === 0 && (
          <p className="text-sm text-muted-foreground">Aucun produit dans le menu pour le moment.</p>
        )}

        <div className="flex items-center gap-3">
          <Button type="submit" variant="primary" size="lg">
            {existingEntry ? "Mettre à jour la journée" : "Valider la journée"}
          </Button>
        </div>
      </form>
    </div>
  );
}

"use client";

import { useActionState, useRef, useState } from "react";
import type { Site, SiteId } from "@/types";
import { runImportAction } from "@/lib/import-actions";
import type { ImportReport } from "@/lib/import/orchestrator";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";

const initialState: ImportReport = { available: true };

const TARGET_LABELS: Record<NonNullable<ImportReport["target"]>, string> = {
  sales: "Historique de ventes",
  inventory: "Inventaire",
  unknown: "Indéterminé",
};

// Director-only import form: one submission carries any mix of a tabular
// file (CSV/Excel), a photo, and free text — lib/import/orchestrator.ts
// decides what to do with whatever combination arrives. Modeled on
// components/avatar-widget.tsx's useActionState + FormData pattern, but as
// a full-page form rather than a floating chat widget, since imports are a
// deliberate, occasional task rather than a running conversation.
export function DataImportForm({ sites, defaultSiteId }: { sites: Site[]; defaultSiteId: SiteId }) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const [imageName, setImageName] = useState<string | null>(null);

  const [state, formAction, isPending] = useActionState(
    async (_prev: ImportReport, formData: FormData) => {
      const result = await runImportAction(formData);
      if (result.available) {
        setFileName(null);
        setImageName(null);
        if (fileInputRef.current) fileInputRef.current.value = "";
        if (imageInputRef.current) imageInputRef.current.value = "";
      }
      return result;
    },
    initialState
  );

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <div>
        <label className="mb-1.5 block text-sm font-medium text-foreground" htmlFor="import-site">
          Établissement
        </label>
        <Select id="import-site" name="siteId" defaultValue={defaultSiteId} className="w-full">
          {sites.map((site) => (
            <option key={site.id} value={site.id}>
              {site.name}
            </option>
          ))}
        </Select>
      </div>

      <div>
        <label className="mb-1.5 block text-sm font-medium text-foreground" htmlFor="import-message">
          Décrivez ce que vous importez (optionnel)
        </label>
        <Input
          id="import-message"
          name="message"
          placeholder="Ex : historique des ventes de juin 2026, inventaire complet du site…"
        />
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <label className="mb-1.5 block text-sm font-medium text-foreground" htmlFor="import-file">
            Fichier (.csv, .xlsx)
          </label>
          <input
            ref={fileInputRef}
            id="import-file"
            type="file"
            name="file"
            accept=".csv,.xlsx,.xlsm"
            className="block w-full text-sm text-foreground file:mr-3 file:rounded-pill file:border-0 file:bg-muted file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-foreground hover:file:bg-border/60"
            onChange={(e) => setFileName(e.target.files?.[0]?.name ?? null)}
          />
          {fileName && <p className="mt-1 truncate text-xs text-muted-foreground">{fileName}</p>}
        </div>

        <div>
          <label className="mb-1.5 block text-sm font-medium text-foreground" htmlFor="import-image">
            Photo (ticket ou feuille d&apos;inventaire)
          </label>
          <input
            ref={imageInputRef}
            id="import-image"
            type="file"
            name="image"
            accept="image/*"
            className="block w-full text-sm text-foreground file:mr-3 file:rounded-pill file:border-0 file:bg-muted file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-foreground hover:file:bg-border/60"
            onChange={(e) => setImageName(e.target.files?.[0]?.name ?? null)}
          />
          {imageName && <p className="mt-1 truncate text-xs text-muted-foreground">{imageName}</p>}
        </div>
      </div>

      <div>
        <Button type="submit" variant="primary" disabled={isPending}>
          {isPending ? "Import en cours…" : "Importer"}
        </Button>
      </div>

      {isPending && (
        <p className="text-sm text-muted-foreground">
          Analyse en cours — cela peut prendre jusqu&apos;à une minute pour une photo ou un gros fichier.
        </p>
      )}

      {state.error && (
        <div className="rounded-card bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {state.target && <p className="font-medium">Classé comme : {TARGET_LABELS[state.target]}</p>}
          <p>{state.error}</p>
        </div>
      )}

      {!state.error && state.written !== undefined && (
        <div className="rounded-card bg-success/10 px-4 py-3 text-sm text-foreground">
          <p className="font-medium">
            {state.target && `${TARGET_LABELS[state.target]} — `}
            {state.written} ligne(s) importée(s) avec succès.
          </p>
          {state.skipped && state.skipped.length > 0 && (
            <div className="mt-2">
              <p className="text-xs text-muted-foreground">
                {state.skipped.length} ligne(s) ignorée(s) :
              </p>
              <ul className="mt-1 list-inside list-disc text-xs text-muted-foreground">
                {state.skipped.slice(0, 10).map((s, i) => (
                  <li key={i}>{s.reason}</li>
                ))}
              </ul>
              {state.skipped.length > 10 && (
                <p className="mt-1 text-xs text-muted-foreground">
                  … et {state.skipped.length - 10} autre(s).
                </p>
              )}
            </div>
          )}
        </div>
      )}
    </form>
  );
}

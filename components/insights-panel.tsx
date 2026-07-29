"use client";

import { useActionState } from "react";
import type { Insight } from "@/lib/ai-insights";
import { generateNarrativeAction, type NarrativeResult } from "@/lib/ai-narrative";
import { InsightCard } from "@/components/ui/insight-card";
import { Button } from "@/components/ui/button";
import { Section } from "@/components/ui/section";

const initialState: NarrativeResult = { available: false };

export function InsightsPanel({
  insights,
  aiConfigured,
}: {
  insights: Insight[];
  aiConfigured: boolean;
}) {
  const [state, formAction, isPending] = useActionState(
    async () => generateNarrativeAction(insights),
    initialState
  );

  return (
    <Section
      title="Insights"
      description="Observations calculées automatiquement à partir des données du groupe."
    >
      {insights.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          Aucune alerte pour le moment — tout est sous contrôle.
        </p>
      ) : (
        <div className="flex flex-col gap-2">
          {insights.map((insight) => (
            <InsightCard key={insight.id} insight={insight} />
          ))}
        </div>
      )}

      <div className="mt-5 border-t border-border pt-4">
        {!aiConfigured ? (
          <p className="text-xs text-muted-foreground">
            Connectez une clé API (OLLAMA_API_KEY) pour activer une synthèse IA en langage naturel de ces
            observations.
          </p>
        ) : (
          <form action={formAction}>
            <Button type="submit" variant="secondary" disabled={isPending}>
              {isPending ? "Génération en cours…" : "Générer une synthèse IA"}
            </Button>
            {state.narrative && (
              <p className="mt-3 text-sm text-foreground">{state.narrative}</p>
            )}
            {state.error && <p className="mt-3 text-sm text-destructive">{state.error}</p>}
          </form>
        )}
      </div>
    </Section>
  );
}

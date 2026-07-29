"use server";

import { requireDirector } from "@/lib/session";
import type { Insight } from "@/lib/ai-insights";
import { callOllama } from "@/lib/ollama-client";

export interface NarrativeResult {
  available: boolean;
  narrative?: string;
  error?: string;
}

// Optional LLM synthesis layer on top of the rule-based insights — inert
// until OLLAMA_API_KEY is configured (no .env file exists in this repo
// yet). Plain fetch via lib/ollama-client.ts, no SDK dependency, so the app
// has zero new runtime dependencies until this is actually wired up with a
// key. See that file for the Ollama Cloud endpoint/auth details.
export async function generateNarrativeAction(insights: Insight[]): Promise<NarrativeResult> {
  await requireDirector();

  const result = await callOllama([
    {
      role: "system",
      content:
        "Tu es l'assistant IA d'un groupe de crêperies. Réponds en français, de façon concise et " +
        "professionnelle.",
    },
    {
      role: "user",
      content:
        "Voici une liste d'observations opérationnelles pour un groupe de crêperies. " +
        "Rédige une synthèse brève (3-4 phrases), à destination d'un directeur, mettant en avant les " +
        "priorités d'action:\n\n" +
        insights.map((i) => `- [${i.severity}] ${i.title}: ${i.detail}`).join("\n"),
    },
  ]);

  return { available: result.available, narrative: result.reply, error: result.error };
}

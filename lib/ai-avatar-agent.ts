import "server-only";

import { callOllama, type OllamaMessage, type OllamaToolDefinition } from "@/lib/ollama-client";
import { extractSalesFromReceiptCore } from "@/lib/sales-extraction-actions";
import type { AvatarClientAction, Role, SiteId } from "@/types";

// Context every tool executor receives — enough for auth/scoping without
// each tool re-deriving it. Extend this object (not each tool's own
// signature) when a future tool needs more ambient info, so the loop and
// registry stay unchanged.
export interface AgentToolContext {
  siteId: SiteId;
  role: Role;
  userId: string;
  // The receipt image attached to *this* chat turn, if any — decoded once
  // by the caller (lib/ai-avatar-actions.ts) and threaded through so a tool
  // that needs "the photo the user just sent" doesn't re-derive it from
  // FormData. Never persisted across turns — see the tool's own doc comment
  // below for the resulting limitation.
  attachedImage: { buffer: Buffer; mediaType: string } | null;
}

interface AgentToolResult {
  // Always-stringifiable content fed back to the model as the next `tool`
  // role message. Keep this small and structured, not prose — the model
  // turns it into prose for the user in its own next turn.
  content: Record<string, unknown>;
  // Optional data channel that bypasses the model entirely, surfaced to the
  // client via AvatarChatResult.clientActions (see lib/ai-avatar-actions.ts)
  // so avatar-widget.tsx can act on it directly (e.g. push extracted values
  // into the sales form) without depending on the model to faithfully
  // restate structured numbers in prose.
  clientPayload?: AvatarClientAction;
}

interface AgentTool {
  definition: OllamaToolDefinition;
  // Thrown errors are caught by the loop and turned into an { error }
  // content payload fed back to the model — a tool must never crash the
  // whole avatar turn.
  execute: (args: Record<string, unknown>, ctx: AgentToolContext) => Promise<AgentToolResult>;
}

// Ouvert à tous les rôles (serveur/manager/directeur), comme le widget
// lui-même aujourd'hui — décision confirmée avec l'utilisateur, contrairement
// au bouton dédié de daily-sales-form.tsx qui reste réservé aux serveurs.
// L'extraction se fait systématiquement dès qu'une photo est jointe, même si
// l'utilisateur n'est pas sur la page des ventes du jour — c'est le widget
// client (via lib/sales-form-bridge.tsx) qui décide ensuite s'il peut
// appliquer les données ou doit inviter l'utilisateur à ouvrir la page.
const fillSalesFromPhotoTool: AgentTool = {
  definition: {
    type: "function",
    function: {
      name: "fill_sales_form_from_photo",
      description:
        "Extrait le chiffre d'affaires (montant carte, montant net total) et les quantités vendues " +
        "par produit à partir d'une photo de ticket de caisse jointe par l'utilisateur, puis remplit " +
        "automatiquement le formulaire de saisie des ventes du jour affiché à l'écran. À utiliser " +
        "uniquement quand l'utilisateur a joint une photo de ticket ET demande explicitement ou " +
        "implicitement de remplir/saisir les ventes à partir de cette photo.",
      parameters: {
        type: "object",
        properties: {
          confirmedByUser: {
            type: "boolean",
            description:
              "true si l'utilisateur a clairement demandé cette action dans ce message ou un message " +
              "précédent de cette conversation ; false si tu n'es pas certain et dois d'abord confirmer " +
              "avec lui avant d'agir.",
          },
        },
        required: ["confirmedByUser"],
      },
    },
  },
  async execute(args, ctx) {
    if (!ctx.attachedImage) {
      return {
        content: {
          error:
            "Aucune photo jointe à ce message. Demande à l'utilisateur de joindre une photo du ticket " +
            "(même s'il en avait déjà envoyé une dans un message précédent — chaque analyse a besoin " +
            "de la photo jointe au message en cours).",
        },
      };
    }
    if (args.confirmedByUser !== true) {
      return { content: { error: "Confirmation utilisateur manquante avant d'agir — pose la question d'abord." } };
    }

    const result = await extractSalesFromReceiptCore(ctx.siteId, ctx.attachedImage.buffer);
    if (!result.available) return { content: { error: "Service IA indisponible." } };
    if (result.error || !result.data) {
      return { content: { error: result.error ?? "Extraction échouée." } };
    }

    return {
      content: {
        success: true,
        cardRevenue: result.data.cardRevenue,
        netRevenue: result.data.netRevenue,
        itemsMatched: result.data.items.length,
        itemsUnmatched: result.data.unmatchedCount,
      },
      clientPayload: { type: "fill-sales-form", data: result.data },
    };
  },
};

// Registre d'outils — ajouter une capacité future = écrire son AgentTool et
// l'ajouter ici. Rien d'autre dans runAgentTurn n'a besoin de changer.
const TOOLS: AgentTool[] = [fillSalesFromPhotoTool];

const MAX_TOOL_ITERATIONS = 4;

export interface AgentTurnResult {
  available: boolean;
  reply?: string;
  error?: string;
  clientActions: AvatarClientAction[];
}

// Boucle agentique multi-tours : appelle le modèle avec les outils
// disponibles, exécute chaque tool_call demandé, renvoie le résultat au
// modèle, et répète jusqu'à une réponse texte finale ou MAX_TOOL_ITERATIONS.
// `seedMessages` doit déjà respecter la contrainte "pas de rôle system
// séparé quand une image est jointe" (voir lib/ai-avatar-actions.ts) — cette
// forme est fixée une fois au tour 1 et jamais modifiée par la boucle
// elle-même (qui n'ajoute que des messages assistant/tool), donc le bug
// system+image ne peut pas resurgir dans les itérations suivantes.
export async function runAgentTurn(
  seedMessages: OllamaMessage[],
  ctx: AgentToolContext
): Promise<AgentTurnResult> {
  const messages = [...seedMessages];
  const clientActions: AvatarClientAction[] = [];
  const toolDefs = TOOLS.map((t) => t.definition);

  for (let i = 0; i < MAX_TOOL_ITERATIONS; i++) {
    const result = await callOllama(messages, { tools: toolDefs });
    if (!result.available) return { available: false, clientActions };
    if (result.error) return { available: true, error: result.error, clientActions };

    if (!result.toolCalls?.length) {
      return { available: true, reply: result.reply, clientActions };
    }

    messages.push({ role: "assistant", content: result.reply ?? "", tool_calls: result.toolCalls });

    for (const call of result.toolCalls) {
      const tool = TOOLS.find((t) => t.definition.function.name === call.function.name);
      const args = parseToolArguments(call.function.arguments);

      if (!tool) {
        messages.push({
          role: "tool",
          tool_name: call.function.name,
          content: JSON.stringify({ error: "Outil inconnu." }),
        });
        continue;
      }

      try {
        const toolResult = await tool.execute(args, ctx);
        messages.push({
          role: "tool",
          tool_name: call.function.name,
          content: JSON.stringify(toolResult.content),
        });
        if (toolResult.clientPayload) clientActions.push(toolResult.clientPayload);
      } catch {
        messages.push({
          role: "tool",
          tool_name: call.function.name,
          content: JSON.stringify({ error: "Erreur interne de l'outil." }),
        });
      }
    }
  }

  return { available: true, reply: "Désolé, je n'ai pas réussi à finaliser cette action.", clientActions };
}

function parseToolArguments(raw: Record<string, unknown> | string): Record<string, unknown> {
  if (typeof raw === "string") {
    try {
      return JSON.parse(raw);
    } catch {
      return {};
    }
  }
  return raw ?? {};
}

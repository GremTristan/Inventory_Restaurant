import "server-only";

const OLLAMA_MODEL = "gemma4:31b-cloud";
const OLLAMA_ENDPOINT = "https://ollama.com/api/chat";

export interface OllamaMessage {
  role: "system" | "user" | "assistant";
  content: string;
  // Base64-encoded image strings (no data: URI prefix) — Ollama's
  // /api/chat shape, confirmed against a live local Ollama instance, keeps
  // images in an `images` array on the message object rather than an
  // Anthropic-style content-block array.
  images?: string[];
}

export interface OllamaChatResult {
  available: boolean;
  reply?: string;
  error?: string;
}

// Shared call point for lib/ai-narrative.ts, lib/ai-avatar-actions.ts, and
// lib/sales-extraction-actions.ts. Gated behind OLLAMA_API_KEY (an Ollama
// Cloud API key generated at ollama.com/settings — distinct from the
// SSH-key-based `ollama signin` CLI auth) — returns { available: false }
// immediately if unset, no network call attempted, so callers degrade
// gracefully rather than crash.
//
// `options.format: "json"` requests JSON-mode output for structured
// extraction (see lib/sales-extraction-actions.ts). Empirically, passing a
// strict JSON Schema object instead of the plain "json" string performed
// worse against gemma4:31b-cloud (the model ignored the schema and replied
// in free text) — only the string form is supported here on purpose.
export async function callOllama(
  messages: OllamaMessage[],
  options?: { format?: "json" }
): Promise<OllamaChatResult> {
  const apiKey = process.env.OLLAMA_API_KEY;
  if (!apiKey) {
    return { available: false };
  }

  try {
    const response = await fetch(OLLAMA_ENDPOINT, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: OLLAMA_MODEL,
        messages,
        stream: false,
        ...(options?.format ? { format: options.format } : {}),
      }),
    });

    if (!response.ok) {
      return { available: true, error: "Le service IA n'a pas pu répondre. Réessayez plus tard." };
    }

    const data = await response.json();
    const reply: string = data.message?.content ?? "";
    return { available: true, reply };
  } catch {
    return { available: true, error: "Le service IA n'a pas pu répondre. Réessayez plus tard." };
  }
}

import "server-only";

const OLLAMA_MODEL = "gemma4:31b-cloud";
const OLLAMA_ENDPOINT = "https://ollama.com/api/chat";

// One entry in a tools array offered to the model — OpenAI-compatible shape,
// which Ollama Cloud's /api/chat also accepts (confirmed via direct testing:
// request tools -> response message.tool_calls, done_reason: "tool_calls").
export interface OllamaToolDefinition {
  type: "function";
  function: {
    name: string;
    description: string;
    parameters: {
      type: "object";
      properties: Record<string, unknown>;
      required?: string[];
    };
  };
}

// A tool invocation requested by the model in an assistant reply.
// `arguments` is typed defensively as object|string — accept either shape
// rather than assume one, since OpenAI-compatible servers vary here.
export interface OllamaToolCall {
  function: {
    name: string;
    arguments: Record<string, unknown> | string;
  };
}

export interface OllamaMessage {
  role: "system" | "user" | "assistant" | "tool";
  content: string;
  // Base64-encoded image strings (no data: URI prefix) — Ollama's
  // /api/chat shape, confirmed against a live local Ollama instance, keeps
  // images in an `images` array on the message object rather than an
  // Anthropic-style content-block array.
  images?: string[];
  // Present when replaying a prior assistant turn that was itself a tool
  // call back into the messages array — needed so the model sees its own
  // tool-call history across loop iterations (see lib/ai-avatar-agent.ts).
  tool_calls?: OllamaToolCall[];
  // Present only on role: "tool" messages — Ollama's /api/chat expects the
  // tool's own name alongside its result content when reporting back.
  tool_name?: string;
}

export interface OllamaChatResult {
  available: boolean;
  reply?: string;
  error?: string;
  // Present when the model chose to call one or more tools instead of
  // replying with content — see lib/ai-avatar-agent.ts's loop.
  toolCalls?: OllamaToolCall[];
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
//
// `options.tools` enables tool-calling (see lib/ai-avatar-agent.ts) — purely
// additive, existing callers that never pass it are unaffected.
export async function callOllama(
  messages: OllamaMessage[],
  options?: { format?: "json"; tools?: OllamaToolDefinition[] }
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
        ...(options?.tools ? { tools: options.tools } : {}),
      }),
    });

    if (!response.ok) {
      return { available: true, error: "Le service IA n'a pas pu répondre. Réessayez plus tard." };
    }

    const data = await response.json();
    const reply: string = data.message?.content ?? "";
    const toolCalls: OllamaToolCall[] | undefined = data.message?.tool_calls;
    return { available: true, reply, toolCalls: toolCalls?.length ? toolCalls : undefined };
  } catch {
    return { available: true, error: "Le service IA n'a pas pu répondre. Réessayez plus tard." };
  }
}

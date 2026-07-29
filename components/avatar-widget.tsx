"use client";

import { useActionState, useCallback, useRef, useState } from "react";
import type { AvatarChatMessage, SiteId } from "@/types";
import { sendAvatarMessageAction, type AvatarChatResult } from "@/lib/ai-avatar-actions";
import { compressImage } from "@/lib/image-compression";
import { useSalesFormBridge } from "@/lib/sales-form-bridge";
import { useSpeechRecognition } from "@/lib/use-speech-recognition";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

const initialState: AvatarChatResult = { available: true };

// Floating chat widget mounted once in app/(app)/layout.tsx, visible to
// every role on every authenticated page. Conversation text is
// intentionally ephemeral (client state only, lost on refresh) — only
// receipt photos + their AI summary persist server-side, via
// lib/ai-avatar-store.ts. This is the first genuinely client-heavy
// interactive component in the app (a live message list needs it), but the
// actual AI call stays a Server Action, matching insights-panel.tsx. Role-
// based context scoping happens entirely server-side in
// sendAvatarMessageAction, so this component doesn't need the caller's role.
export function AvatarWidget({
  siteId,
  aiConfigured,
}: {
  siteId: SiteId;
  aiConfigured: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<AvatarChatMessage[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const messageInputRef = useRef<HTMLInputElement>(null);
  const [pendingFileName, setPendingFileName] = useState<string | null>(null);
  const [isCompressing, setIsCompressing] = useState(false);
  const { applyToTarget } = useSalesFormBridge();

  const handleTranscript = useCallback((transcript: string) => {
    if (!messageInputRef.current) return;
    const existing = messageInputRef.current.value.trim();
    messageInputRef.current.value = existing ? `${existing} ${transcript}` : transcript;
  }, []);
  const { isSupported: speechSupported, isListening, start: startListening } =
    useSpeechRecognition(handleTranscript);

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const original = e.target.files?.[0];
    if (!original) {
      setPendingFileName(null);
      return;
    }

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
    setPendingFileName(compressed.name);
  }

  const [state, formAction, isPending] = useActionState(
    async (_prev: AvatarChatResult, formData: FormData) => {
      const text = String(formData.get("message") ?? "").trim();
      const imageFile = formData.get("image");
      const hasImage = imageFile instanceof File && imageFile.size > 0;

      setMessages((prev) => [
        ...prev,
        { role: "user", text: text || (hasImage ? "(photo du ticket)" : "") },
      ]);

      const result = await sendAvatarMessageAction(messages, formData);

      if (result.reply) {
        setMessages((prev) => [...prev, { role: "assistant", text: result.reply! }]);
      }

      for (const action of result.clientActions ?? []) {
        if (action.type === "fill-sales-form") {
          const applied = applyToTarget(siteId, action.data);
          setMessages((prev) => [
            ...prev,
            applied
              ? { role: "assistant", text: "J'ai rempli le formulaire des ventes du jour avec les données du ticket." }
              : {
                  role: "assistant",
                  text:
                    "J'ai lu les données du ticket, mais vous n'êtes pas sur la page des ventes du jour de " +
                    "cet établissement. Ouvrez-la puis redites-le-moi pour que je les applique.",
                },
          ]);
        }
      }

      setPendingFileName(null);
      return result;
    },
    initialState
  );

  if (!aiConfigured) {
    return (
      <div className="fixed bottom-5 right-5 z-50">
        <div
          className="flex h-14 w-14 items-center justify-center rounded-full bg-muted text-2xl text-muted-foreground shadow-lg"
          title="Connectez une clé API (OLLAMA_API_KEY) pour activer l'assistant IA."
        >
          🤖
        </div>
      </div>
    );
  }

  return (
    <div className="fixed bottom-5 right-5 z-50 flex flex-col items-end gap-3">
      {open && (
        <div className="flex max-h-[70vh] w-[360px] max-w-[90vw] flex-col overflow-hidden rounded-xl border border-border bg-card shadow-xl">
          <div className="flex items-center justify-between border-b border-border bg-muted px-4 py-3">
            <span className="text-sm font-semibold text-foreground">Assistant IA</span>
            <Button variant="ghost" className="px-2 py-1 text-xs" onClick={() => setOpen(false)}>
              Fermer
            </Button>
          </div>

          <div className="flex-1 space-y-3 overflow-y-auto px-4 py-3">
            {messages.length === 0 && (
              <p className="text-xs text-muted-foreground">
                Envoyez une photo du ticket de caisse ou posez une question sur votre établissement.
              </p>
            )}
            {messages.map((m, i) => (
              <div key={i} className={m.role === "user" ? "text-right" : "text-left"}>
                <p
                  className={
                    m.role === "user"
                      ? "inline-block rounded-lg bg-accent px-3 py-1.5 text-sm text-accent-foreground"
                      : "inline-block rounded-lg bg-muted px-3 py-1.5 text-sm text-foreground"
                  }
                >
                  {m.text}
                </p>
              </div>
            ))}
            {isPending && (
              <p className="text-xs text-muted-foreground">
                L&apos;assistant réfléchit… (l&apos;analyse d&apos;une photo peut prendre jusqu&apos;à une minute)
              </p>
            )}
            {state.error && <p className="text-xs text-destructive">{state.error}</p>}
          </div>

          <form action={formAction} className="flex flex-col gap-2 border-t border-border px-3 py-3">
            <input type="hidden" name="siteId" value={siteId} />
            {isCompressing && (
              <p className="truncate text-xs text-muted-foreground">Compression de la photo…</p>
            )}
            {!isCompressing && pendingFileName && (
              <p className="truncate text-xs text-muted-foreground">📷 {pendingFileName}</p>
            )}
            <div className="flex items-center gap-2">
              <input
                ref={fileInputRef}
                type="file"
                name="image"
                accept="image/*"
                capture="environment"
                className="hidden"
                onChange={handleFileChange}
              />
              <Button
                type="button"
                variant="ghost"
                className="px-2"
                onClick={() => fileInputRef.current?.click()}
                title="Joindre une photo de ticket"
                disabled={isCompressing}
              >
                📷
              </Button>
              {speechSupported && (
                <Button
                  type="button"
                  variant="ghost"
                  className="px-2"
                  onClick={startListening}
                  title="Dicter votre message"
                  disabled={isPending || isListening}
                >
                  {isListening ? "🔴" : "🎙️"}
                </Button>
              )}
              <Input ref={messageInputRef} name="message" placeholder="Votre message…" className="flex-1" />
              <Button
                type="submit"
                variant="primary"
                disabled={isPending || isCompressing}
                className="px-3 py-1.5 text-xs"
              >
                Envoyer
              </Button>
            </div>
          </form>
        </div>
      )}

      <Button
        type="button"
        variant="primary"
        className="h-14 w-14 rounded-full p-0 text-xl shadow-lg"
        onClick={() => setOpen((v) => !v)}
      >
        {open ? "✕" : "💬"}
      </Button>
    </div>
  );
}

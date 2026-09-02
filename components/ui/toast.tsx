"use client";

import { createContext, useCallback, useContext, useMemo, useRef, useState, useSyncExternalStore } from "react";
import { CheckCircle2, CloudOff, XCircle } from "lucide-react";
import { cn } from "@/lib/utils";

type ToastKind = "success" | "error" | "offline";

interface Toast {
  id: number;
  kind: ToastKind;
  message: string;
}

const ToastContext = createContext<(kind: ToastKind, message: string) => void>(() => {});

// Short, non-blocking confirmations: the user never wonders "did it work?".
export function useToast() {
  return useContext(ToastContext);
}

const ICONS: Record<ToastKind, typeof CheckCircle2> = {
  success: CheckCircle2,
  error: XCircle,
  offline: CloudOff,
};

const STYLES: Record<ToastKind, string> = {
  success: "bg-success text-success-foreground",
  error: "bg-destructive text-destructive-foreground",
  offline: "bg-warning text-warning-foreground",
};

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const counter = useRef(0);

  const push = useCallback((kind: ToastKind, message: string) => {
    const id = ++counter.current;
    setToasts((current) => [...current.slice(-2), { id, kind, message }]);
    setTimeout(() => setToasts((current) => current.filter((t) => t.id !== id)), kind === "error" ? 4000 : 2200);
  }, []);

  return (
    <ToastContext.Provider value={push}>
      {children}
      <div
        aria-live="polite"
        className="pointer-events-none fixed inset-x-0 top-4 z-[100] flex flex-col items-center gap-2 px-4"
      >
        {toasts.map((toast) => {
          const Icon = ICONS[toast.kind];
          return (
            <div
              key={toast.id}
              className={cn(
                "flex items-center gap-2 rounded-pill px-4 py-2.5 text-[14px] font-semibold shadow-lg animate-[toast-in_.2s_ease-out]",
                STYLES[toast.kind]
              )}
            >
              <Icon className="h-4 w-4" />
              {toast.message}
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}

// Tracks connectivity; exposes it to screens that queue actions offline.
export function useOnline(): boolean {
  return useSyncExternalStore(subscribeOnline, () => navigator.onLine, () => true);
}

function subscribeOnline(callback: () => void) {
  window.addEventListener("online", callback);
  window.addEventListener("offline", callback);
  return () => {
    window.removeEventListener("online", callback);
    window.removeEventListener("offline", callback);
  };
}

export function OfflineBanner({ pending = 0 }: { pending?: number }) {
  const online = useOnline();
  const text = useMemo(() => {
    if (online && pending === 0) return null;
    if (!online) return pending > 0 ? `Hors ligne — ${pending} action(s) en attente d’envoi` : "Hors ligne — vos actions seront envoyées au retour du réseau";
    return `Synchronisation… ${pending} action(s)`;
  }, [online, pending]);
  if (!text) return null;
  return (
    <div className="flex items-center justify-center gap-2 bg-warning px-4 py-2 text-sm font-semibold text-warning-foreground">
      <CloudOff className="h-4 w-4" />
      {text}
    </div>
  );
}

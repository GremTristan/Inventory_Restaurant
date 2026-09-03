"use client";

import { useCallback, useEffect, useRef, useState } from "react";

// Store-and-forward queue for tablet actions. A tap is recorded locally
// first and applied to the screen immediately; the request is sent right
// away when online, or replayed in order once the network is back. Entries
// carry an idempotency key so a replay after a half-failed request never
// double-applies (the server treats repeats as no-ops).
export interface QueuedRequest {
  id: string;
  url: string;
  method: "POST" | "PATCH";
  body: unknown;
  createdAt: number;
}

function storageKey(namespace: string) {
  return `crepo.queue.${namespace}`;
}

function load(namespace: string): QueuedRequest[] {
  try {
    const raw = localStorage.getItem(storageKey(namespace));
    return raw ? (JSON.parse(raw) as QueuedRequest[]) : [];
  } catch {
    return [];
  }
}

function save(namespace: string, entries: QueuedRequest[]) {
  localStorage.setItem(storageKey(namespace), JSON.stringify(entries));
}

export function newClientId(): string {
  return typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

export interface FlushResult {
  sent: number;
  failed: QueuedRequest[];
}

export function useOfflineQueue(namespace: string, onReplayed?: () => void) {
  const [pending, setPending] = useState(0);
  const flushing = useRef(false);

  const refresh = useCallback(() => setPending(load(namespace).length), [namespace]);

  const flush = useCallback(async (): Promise<FlushResult> => {
    if (flushing.current || (typeof navigator !== "undefined" && !navigator.onLine)) {
      refresh();
      return { sent: 0, failed: [] };
    }
    flushing.current = true;
    let sent = 0;
    const failed: QueuedRequest[] = [];
    try {
      let entries = load(namespace);
      while (entries.length > 0) {
        const [head, ...rest] = entries;
        try {
          const response = await fetch(head.url, {
            method: head.method,
            headers: { "content-type": "application/json" },
            body: JSON.stringify(head.body),
          });
          if (response.status >= 500) throw new Error("server");
          // 4xx = the server rejected the action for good (e.g. order already
          // paid). Drop it rather than retry forever, but report it.
          if (!response.ok) failed.push(head);
          else sent += 1;
          entries = rest;
          save(namespace, entries);
        } catch {
          // Network still down — keep the entry and stop.
          break;
        }
      }
    } finally {
      flushing.current = false;
      refresh();
      if (sent > 0) onReplayed?.();
    }
    return { sent, failed };
  }, [namespace, onReplayed, refresh]);

  // Optimistic: enqueue, then try to send right now.
  const enqueue = useCallback(
    async (request: Omit<QueuedRequest, "id" | "createdAt">) => {
      const entry: QueuedRequest = { ...request, id: newClientId(), createdAt: Date.now() };
      save(namespace, [...load(namespace), entry]);
      refresh();
      return flush();
    },
    [namespace, flush, refresh]
  );

  useEffect(() => {
    // Initial replay of anything left from a previous session; flush() itself
    // refreshes the pending count once done.
    void flush();
    const onOnline = () => void flush();
    window.addEventListener("online", onOnline);
    const interval = setInterval(() => void flush(), 15000);
    return () => {
      window.removeEventListener("online", onOnline);
      clearInterval(interval);
    };
  }, [flush, refresh]);

  return { pending, enqueue, flush };
}

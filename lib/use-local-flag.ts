"use client";

import { useCallback, useSyncExternalStore } from "react";

const EVENT = "crepo:localflag";

function subscribe(callback: () => void) {
  window.addEventListener("storage", callback);
  window.addEventListener(EVENT, callback);
  return () => {
    window.removeEventListener("storage", callback);
    window.removeEventListener(EVENT, callback);
  };
}

// Boolean preference persisted per tablet (e.g. "mute kitchen sound").
// Reads through useSyncExternalStore so SSR renders the default without a
// hydration mismatch and updates propagate to every subscriber.
export function useLocalFlag(key: string, fallback = false): [boolean, (value: boolean) => void] {
  const value = useSyncExternalStore(
    subscribe,
    () => {
      const raw = localStorage.getItem(key);
      return raw === null ? fallback : raw === "1";
    },
    () => fallback
  );
  const set = useCallback(
    (next: boolean) => {
      localStorage.setItem(key, next ? "1" : "0");
      window.dispatchEvent(new Event(EVENT));
    },
    [key]
  );
  return [value, set];
}

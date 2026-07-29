"use client";

import { createContext, useCallback, useContext, useRef, useState } from "react";
import type { ExtractedSalesData, SiteId } from "@/types";

interface SalesFormTarget {
  siteId: SiteId;
  apply: (data: ExtractedSalesData) => void;
}

interface SalesFormBridgeValue {
  // Called by daily-sales-form.tsx on mount/unmount to register itself as
  // the current fill target. Only one target is ever live in practice (one
  // sales page visible per tab), but keyed by siteId so a stale
  // registration from a just-unmounted page can't shadow a new one.
  registerTarget: (siteId: SiteId, apply: (data: ExtractedSalesData) => void) => () => void;
  // Called by avatar-widget.tsx when a tool result needs to reach the form.
  // Returns whether a live target for that siteId existed.
  applyToTarget: (siteId: SiteId, data: ExtractedSalesData) => boolean;
}

const SalesFormBridgeContext = createContext<SalesFormBridgeValue | null>(null);

// No state-management library exists anywhere in this codebase (confirmed:
// no Context, no Zustand/Jotai/Redux, no event bus) — this is the minimal
// mechanism letting the globally-mounted AvatarWidget push data into
// whichever page-specific DailySalesForm happens to be mounted, without
// either component knowing about the other directly.
export function SalesFormBridgeProvider({ children }: { children: React.ReactNode }) {
  // A ref, not state: registering/unregistering must never trigger a
  // re-render of the provider's subtree (which now wraps the entire app's
  // {children}) — only the two components that actually care (the form
  // registers, the widget calls) touch this, both imperatively.
  const targetRef = useRef<SalesFormTarget | null>(null);

  const registerTarget = useCallback((siteId: SiteId, apply: (data: ExtractedSalesData) => void) => {
    targetRef.current = { siteId, apply };
    return () => {
      if (targetRef.current?.siteId === siteId) targetRef.current = null;
    };
  }, []);

  const applyToTarget = useCallback((siteId: SiteId, data: ExtractedSalesData) => {
    if (targetRef.current?.siteId === siteId) {
      targetRef.current.apply(data);
      return true;
    }
    return false;
  }, []);

  const [value] = useState<SalesFormBridgeValue>(() => ({ registerTarget, applyToTarget }));
  return <SalesFormBridgeContext.Provider value={value}>{children}</SalesFormBridgeContext.Provider>;
}

export function useSalesFormBridge(): SalesFormBridgeValue {
  const ctx = useContext(SalesFormBridgeContext);
  if (!ctx) throw new Error("useSalesFormBridge must be used within SalesFormBridgeProvider");
  return ctx;
}

"use client";

import { useCallback, useEffect, useState } from "react";
import type { Order } from "@/types";

interface Feed {
  active: Order[];
  paidToday: Order[];
}

// Polls the site's order board. Keeps the last good copy so the screen
// stays usable through a Wi-Fi drop.
export function useOrdersFeed(siteId: string, initial: Feed, intervalMs = 8000) {
  const [feed, setFeed] = useState<Feed>(initial);

  const refresh = useCallback(async () => {
    try {
      const response = await fetch(`/api/orders/${siteId}`, { cache: "no-store" });
      if (!response.ok) return;
      const data = (await response.json()) as Feed;
      setFeed({ active: data.active, paidToday: data.paidToday });
    } catch {
      // offline — keep current
    }
  }, [siteId]);

  useEffect(() => {
    const interval = setInterval(() => {
      if (navigator.onLine) void refresh();
    }, intervalMs);
    return () => clearInterval(interval);
  }, [refresh, intervalMs]);

  return { ...feed, setFeed, refresh };
}

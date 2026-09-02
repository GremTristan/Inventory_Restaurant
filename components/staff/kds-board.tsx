"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Bell, BellOff, Check, RotateCcw, ShoppingBag, Utensils } from "lucide-react";
import { OfflineBanner, useOnline, useToast } from "@/components/ui/toast";
import { useOfflineQueue } from "@/lib/offline-queue";
import { useLocalFlag } from "@/lib/use-local-flag";
import type { Order } from "@/types";
import { cn } from "@/lib/utils";

const POLL_MS = 5000;

function elapsedMinutes(iso: string | null, now: number): number {
  if (!iso) return 0;
  return Math.max(0, Math.floor((now - new Date(iso).getTime()) / 60000));
}

function urgency(minutes: number): "ok" | "warn" | "late" {
  if (minutes >= 20) return "late";
  if (minutes >= 10) return "warn";
  return "ok";
}

const URGENCY_CLASS = {
  ok: "border-success/40",
  warn: "border-warning",
  late: "border-destructive pulse-urgent",
};

const URGENCY_BADGE = {
  ok: "bg-success/10 text-success",
  warn: "bg-warning/15 text-warning",
  late: "bg-destructive text-destructive-foreground",
};

function beep() {
  try {
    const ctx = new AudioContext();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.frequency.value = 880;
    gain.gain.value = 0.15;
    osc.connect(gain).connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.18);
  } catch {
    // Audio is a nicety; some tablets block it until first interaction.
  }
}

export function KdsBoard({ siteId, initialQueue }: { siteId: string; initialQueue: Order[] }) {
  const [queue, setQueue] = useState<Order[]>(initialQueue);
  const [now, setNow] = useState(() => Date.now());
  const [muted, setMuted] = useLocalFlag("crepo.kds.muted");
  const online = useOnline();
  const toast = useToast();
  const knownIds = useRef(new Set(initialQueue.map((o) => o.id)));
  const cacheKey = `crepo.kds.${siteId}`;

  const refresh = useCallback(async () => {
    try {
      const response = await fetch(`/api/kds/${siteId}`, { cache: "no-store" });
      if (!response.ok) return;
      const data = (await response.json()) as { queue: Order[] };
      setQueue((current) => {
        // Keep local optimistic "ready" flips that the server hasn't seen yet.
        const localReady = new Set(current.filter((o) => o.status === "ready").map((o) => o.id));
        const merged = data.queue.map((o) => (localReady.has(o.id) && o.status === "sent" ? { ...o, status: "ready" as const } : o));
        return merged;
      });
      localStorage.setItem(cacheKey, JSON.stringify(data.queue));
      const fresh = data.queue.filter((o) => !knownIds.current.has(o.id));
      if (fresh.length > 0) {
        fresh.forEach((o) => knownIds.current.add(o.id));
        if (!muted) beep();
      }
    } catch {
      // Offline: if the page came from the service-worker cache with an
      // empty queue, fall back to the last queue this tablet saw.
      const cached = localStorage.getItem(cacheKey);
      if (cached) {
        try {
          const parsed = JSON.parse(cached) as Order[];
          setQueue((current) => (current.length === 0 ? parsed : current));
        } catch {
          // ignore corrupt cache
        }
      }
    }
  }, [siteId, cacheKey, muted]);

  const { pending, enqueue } = useOfflineQueue(`kds.${siteId}`, refresh);

  useEffect(() => {
    const first = setTimeout(() => void refresh(), 0);
    const tick = setInterval(() => setNow(Date.now()), 10000);
    const poll = setInterval(() => {
      if (navigator.onLine) void refresh();
    }, POLL_MS);
    return () => {
      clearTimeout(first);
      clearInterval(tick);
      clearInterval(poll);
    };
  }, [refresh]);

  const flip = async (order: Order, action: "ready" | "preparing") => {
    const status = action === "ready" ? "ready" : "sent";
    setQueue((current) =>
      current.map((o) => (o.id === order.id ? { ...o, status, readyAt: action === "ready" ? new Date().toISOString() : null } : o))
    );
    toast(online ? "success" : "offline", action === "ready" ? `Commande n° ${order.number} prête` : `Commande n° ${order.number} reprise`);
    const result = await enqueue({ url: `/api/kds/${siteId}`, method: "POST", body: { action, orderId: order.id } });
    if (result.failed.length > 0) {
      toast("error", "Une action n’a pas pu être appliquée (commande déjà clôturée ?)");
      void refresh();
    }
  };

  const toPrepare = useMemo(() => queue.filter((o) => o.status === "sent"), [queue]);
  const ready = useMemo(() => queue.filter((o) => o.status === "ready"), [queue]);

  return (
    <div className="flex flex-col gap-5">
      <OfflineBanner pending={pending} />
      <div className="flex items-center justify-between">
        <h1 className="text-[17px] font-bold tracking-tight text-foreground">
          À préparer <span className="ml-2 rounded-pill bg-accent px-3 py-0.5 text-lg text-accent-foreground">{toPrepare.length}</span>
        </h1>
        <button
          type="button"
          onClick={() => {
            const next = !muted;
            setMuted(next);
            localStorage.setItem("crepo.kds.muted", next ? "1" : "0");
          }}
          className="flex h-11 items-center gap-2 rounded-pill px-4 text-sm font-medium text-muted-foreground hover:bg-card"
          aria-pressed={muted}
        >
          {muted ? <BellOff className="h-5 w-5" /> : <Bell className="h-5 w-5" />}
          {muted ? "Son coupé" : "Son activé"}
        </button>
      </div>

      {toPrepare.length === 0 ? (
        <div className="rounded-card bg-card p-6 text-center shadow-sm">
          <Utensils className="mx-auto h-10 w-10 text-muted-foreground" />
          <p className="mt-3 text-[15px] font-semibold tracking-tight text-foreground">Rien à préparer pour l’instant</p>
          <p className="text-sm text-muted-foreground">Les nouvelles commandes apparaissent ici automatiquement.</p>
        </div>
      ) : (
        <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
          {toPrepare.map((order) => {
            const minutes = elapsedMinutes(order.sentAt, now);
            const level = urgency(minutes);
            return (
              <article
                key={order.id}
                className={cn("flex flex-col rounded-card border-2 bg-card shadow-sm lg:border-4", URGENCY_CLASS[level])}
              >
                <header className="flex items-center justify-between px-4 pt-4">
                  <div className="flex items-center gap-2">
                    <span className="text-[20px] font-bold tracking-tight tabular-nums text-foreground lg:text-2xl">n° {order.number}</span>
                    <span className="flex items-center gap-1 rounded-pill bg-muted px-3 py-1 text-sm font-semibold text-foreground">
                      {order.kind === "takeaway" ? <ShoppingBag className="h-4 w-4" /> : <Utensils className="h-4 w-4" />}
                      {order.kind === "takeaway" ? "À emporter" : order.tableLabel ? `Table ${order.tableLabel}` : "Table"}
                    </span>
                  </div>
                  <span className={cn("rounded-pill px-3 py-1 text-base font-bold tabular-nums", URGENCY_BADGE[level])}>
                    {minutes} min
                  </span>
                </header>
                <ul className="flex-1 space-y-2 px-4 py-4">
                  {order.items.map((item) => (
                    <li key={item.id} className="flex items-start gap-3 text-lg leading-tight">
                      <span className="min-w-8 rounded-control bg-accent/10 px-2 text-center font-bold text-accent">{item.quantity}</span>
                      <span className="flex-1">
                        <span className="font-semibold text-foreground">{item.name}</span>
                        {item.note && <span className="block text-base italic text-warning">{item.note}</span>}
                      </span>
                    </li>
                  ))}
                </ul>
                {order.note && <p className="px-4 pb-3 text-base italic text-warning">Note : {order.note}</p>}
                <button
                  type="button"
                  onClick={() => flip(order, "ready")}
                  className="m-2.5 flex min-h-11 items-center justify-center gap-2 rounded-card bg-success text-[15px] font-bold tracking-tight lg:min-h-14 lg:text-lg text-success-foreground shadow-sm transition-transform active:scale-[0.97] select-none touch-manipulation"
                >
                  <Check className="h-5 w-5 lg:h-6 lg:w-6" /> Prête
                </button>
              </article>
            );
          })}
        </div>
      )}

      {ready.length > 0 && (
        <section className="mt-4">
          <h2 className="mb-3 text-lg font-bold text-muted-foreground">Prêtes, en attente du service ({ready.length})</h2>
          <div className="flex flex-wrap gap-3">
            {ready.map((order) => (
              <div key={order.id} className="flex items-center gap-3 rounded-card bg-card px-4 py-3 shadow-sm">
                <span className="text-[17px] font-bold tracking-tight tabular-nums text-foreground">n° {order.number}</span>
                <span className="text-sm text-muted-foreground">
                  {order.kind === "takeaway" ? "À emporter" : order.tableLabel ? `Table ${order.tableLabel}` : "Table"} ·{" "}
                  {order.items.reduce((n, i) => n + i.quantity, 0)} art.
                </span>
                <button
                  type="button"
                  onClick={() => flip(order, "preparing")}
                  className="flex h-11 items-center gap-1 rounded-pill px-3 text-sm font-medium text-muted-foreground hover:bg-muted"
                  aria-label={`Reprendre la commande ${order.number}`}
                >
                  <RotateCcw className="h-4 w-4" /> Reprendre
                </button>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

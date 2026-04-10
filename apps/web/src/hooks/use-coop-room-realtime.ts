"use client";

import { useEffect, useRef } from "react";
import { COOP_WS_PROTOCOL_VERSION, type CoopRoomSnapshot } from "@gac/shared";

export type UseCoopRoomRealtimeOptions = {
  wsUrl: string | undefined;
  roomId: string | null;
  guestId: string | null;
  /** When false, no socket (e.g. join gate or SSR). */
  enabled: boolean;
  onSnapshot: (snap: CoopRoomSnapshot) => void;
};

/**
 * Room-scoped WebSocket: subscribe + push `state` snapshots (viewer-specific).
 * Reconnects with exponential backoff. HTTP polling remains a backup in the parent.
 */
export function useCoopRoomRealtime(options: UseCoopRoomRealtimeOptions): void {
  const { wsUrl, roomId, guestId, enabled, onSnapshot } = options;
  const cbRef = useRef(onSnapshot);

  useEffect(() => {
    cbRef.current = onSnapshot;
  }, [onSnapshot]);

  useEffect(() => {
    if (!enabled || !roomId || !guestId) return;
    const wsEndpoint = (wsUrl ?? "").trim();
    if (!wsEndpoint) return;

    let closed = false;
    let ws: WebSocket | null = null;
    let attempt = 0;
    let reconnectTimer: ReturnType<typeof setTimeout> | null = null;

    const clearTimer = () => {
      if (reconnectTimer) {
        clearTimeout(reconnectTimer);
        reconnectTimer = null;
      }
    };

    const scheduleReconnect = () => {
      if (closed) return;
      clearTimer();
      attempt = Math.min(attempt + 1, 8);
      const delay = Math.min(800 * 2 ** attempt, 30_000);
      reconnectTimer = setTimeout(connect, delay);
    };

    function connect() {
      if (closed) return;
      clearTimer();
      try {
        ws = new WebSocket(wsEndpoint);
      } catch {
        scheduleReconnect();
        return;
      }

      ws.onopen = () => {
        attempt = 0;
        ws?.send(
          JSON.stringify({
            type: "subscribe",
            roomId,
            guestId,
            protocol: COOP_WS_PROTOCOL_VERSION,
          }),
        );
      };

      ws.onmessage = (ev) => {
        try {
          const j = JSON.parse(String(ev.data)) as {
            type?: string;
            payload?: CoopRoomSnapshot;
          };
          if (j.type === "state" && j.payload) {
            cbRef.current(j.payload);
          }
        } catch {
          /* ignore malformed */
        }
      };

      ws.onclose = () => {
        if (closed) return;
        scheduleReconnect();
      };

      ws.onerror = () => {
        try {
          ws?.close();
        } catch {
          /* */
        }
      };
    }

    connect();

    return () => {
      closed = true;
      clearTimer();
      attempt = 0;
      try {
        ws?.close();
      } catch {
        /* */
      }
      ws = null;
    };
  }, [wsUrl, roomId, guestId, enabled]);
}

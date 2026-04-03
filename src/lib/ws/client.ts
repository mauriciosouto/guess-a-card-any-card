/**
 * WebSocket client bootstrap — wire to native WS and typed envelopes in a later phase.
 */

export type WsConnectionState = "idle" | "connecting" | "open" | "closed" | "error";

export function getDefaultWsUrl(): string {
  if (typeof window === "undefined") return "";
  const proto = window.location.protocol === "https:" ? "wss:" : "ws:";
  return `${proto}//${window.location.host}/api/ws`;
}

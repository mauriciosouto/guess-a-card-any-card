/**
 * Typed WebSocket contracts — coop room channel (Prompt 8).
 * Server never trusts client for game actions; only subscribe + ping.
 */

export const COOP_WS_PROTOCOL_VERSION = 1 as const;

export type ClientPingMessage = {
  type: "ping";
};

export type ClientSubscribeMessage = {
  type: "subscribe";
  roomId: string;
  guestId: string;
  protocol: typeof COOP_WS_PROTOCOL_VERSION;
};

export type ClientToServerMessage = ClientPingMessage | ClientSubscribeMessage;

export type ServerPongMessage = { type: "pong" };

export type ServerStateMessage<TPayload = unknown> = {
  type: "state";
  seq: number;
  payload: TPayload;
};

export type ServerErrorMessage = {
  type: "error";
  code: string;
  message: string;
};

export type ServerToClientMessage<TPayload = unknown> =
  | ServerPongMessage
  | ServerStateMessage<TPayload>
  | ServerErrorMessage;

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function isUuid(s: string): boolean {
  return UUID_RE.test(s.trim());
}

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

export function parseClientToServerMessage(raw: string): ClientToServerMessage | null {
  let j: unknown;
  try {
    j = JSON.parse(raw);
  } catch {
    return null;
  }
  if (!isRecord(j) || typeof j.type !== "string") return null;

  if (j.type === "ping") {
    return { type: "ping" };
  }

  if (j.type === "subscribe") {
    const roomId = typeof j.roomId === "string" ? j.roomId.trim() : "";
    const guestId = typeof j.guestId === "string" ? j.guestId.trim() : "";
    const protocol = j.protocol;
    if (!isUuid(roomId) || guestId.length < 4) return null;
    if (protocol !== COOP_WS_PROTOCOL_VERSION) return null;
    return { type: "subscribe", roomId, guestId, protocol: COOP_WS_PROTOCOL_VERSION };
  }

  return null;
}

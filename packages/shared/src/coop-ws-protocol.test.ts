import { describe, expect, it } from "vitest";
import {
  COOP_WS_PROTOCOL_VERSION,
  parseClientToServerMessage,
} from "./coop-ws-protocol";

const validRoom = "550e8400-e29b-41d4-a716-446655440000";

describe("parseClientToServerMessage", () => {
  it("parses ping", () => {
    expect(parseClientToServerMessage(JSON.stringify({ type: "ping" }))).toEqual({
      type: "ping",
    });
  });

  it("parses subscribe with protocol version", () => {
    expect(
      parseClientToServerMessage(
        JSON.stringify({
          type: "subscribe",
          roomId: validRoom,
          guestId: "guest-uuid-or-token",
          protocol: COOP_WS_PROTOCOL_VERSION,
        }),
      ),
    ).toEqual({
      type: "subscribe",
      roomId: validRoom,
      guestId: "guest-uuid-or-token",
      protocol: COOP_WS_PROTOCOL_VERSION,
    });
  });

  it("rejects wrong protocol version", () => {
    expect(
      parseClientToServerMessage(
        JSON.stringify({
          type: "subscribe",
          roomId: validRoom,
          guestId: "long-enough",
          protocol: 999,
        }),
      ),
    ).toBeNull();
  });

  it("rejects invalid room id", () => {
    expect(
      parseClientToServerMessage(
        JSON.stringify({
          type: "subscribe",
          roomId: "not-a-uuid",
          guestId: "long-enough",
          protocol: COOP_WS_PROTOCOL_VERSION,
        }),
      ),
    ).toBeNull();
  });

  it("rejects short guest id", () => {
    expect(
      parseClientToServerMessage(
        JSON.stringify({
          type: "subscribe",
          roomId: validRoom,
          guestId: "abc",
          protocol: COOP_WS_PROTOCOL_VERSION,
        }),
      ),
    ).toBeNull();
  });

  it("returns null on invalid JSON", () => {
    expect(parseClientToServerMessage("not json")).toBeNull();
  });
});

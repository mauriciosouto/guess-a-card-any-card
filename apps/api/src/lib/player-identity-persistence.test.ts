import { describe, expect, it } from "vitest";

import {
  challengeHostOwnershipFromIdentity,
  gamePlayerOwnershipFromIdentity,
  PlayerIdentityPersistenceError,
} from "@/lib/player-identity-persistence";

describe("gamePlayerOwnershipFromIdentity", () => {
  it("user actor → userId only", () => {
    expect(
      gamePlayerOwnershipFromIdentity({
        userId: "00000000-0000-4000-8000-000000000001",
        guestId: null,
      }),
    ).toEqual({
      userId: "00000000-0000-4000-8000-000000000001",
      guestId: null,
    });
  });

  it("guest actor → guestId only", () => {
    expect(
      gamePlayerOwnershipFromIdentity({
        userId: null,
        guestId: "guest-abc",
      }),
    ).toEqual({ userId: null, guestId: "guest-abc" });
  });

  it("rejects both userId and guestId", () => {
    expect(() =>
      gamePlayerOwnershipFromIdentity({
        userId: "00000000-0000-4000-8000-000000000001",
        guestId: "guest-abc",
      }),
    ).toThrow(PlayerIdentityPersistenceError);
  });

  it("rejects neither", () => {
    expect(() =>
      gamePlayerOwnershipFromIdentity({ userId: null, guestId: null }),
    ).toThrow(PlayerIdentityPersistenceError);
    expect(() =>
      gamePlayerOwnershipFromIdentity({ userId: "", guestId: "   " }),
    ).toThrow(PlayerIdentityPersistenceError);
  });
});

describe("challengeHostOwnershipFromIdentity", () => {
  it("maps user to createdBy*", () => {
    expect(
      challengeHostOwnershipFromIdentity({
        userId: "00000000-0000-4000-8000-000000000002",
        guestId: null,
      }),
    ).toEqual({
      createdByUserId: "00000000-0000-4000-8000-000000000002",
      createdByGuestId: null,
    });
  });

  it("maps guest to createdByGuestId", () => {
    expect(
      challengeHostOwnershipFromIdentity({
        userId: null,
        guestId: "host-guest",
      }),
    ).toEqual({
      createdByUserId: null,
      createdByGuestId: "host-guest",
    });
  });
});

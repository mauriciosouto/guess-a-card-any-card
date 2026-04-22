import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/server/auth/ensure-local-user", () => ({
  ensureLocalUserForAuth: vi.fn().mockResolvedValue(undefined),
}));

import { ensureLocalUserForAuth } from "@/server/auth/ensure-local-user";
import { RequestIdentityError } from "@/server/auth/request-identity-error";
import {
  resolveActorFromRequest,
  resolvePlayerIdentityForGameRequest,
  tryResolveUserIdFromRequest,
} from "@/server/auth/resolve-actor";

const USER_ID = "00000000-0000-4000-8000-0000000000aa";

function headers(init: Record<string, string>): Headers {
  return new Headers(init);
}

describe("resolveActorFromRequest", () => {
  beforeEach(() => {
    vi.mocked(ensureLocalUserForAuth).mockClear();
  });

  it("valid JWT → UserActor", async () => {
    const verifyAccessToken = vi
      .fn()
      .mockResolvedValue({ sub: USER_ID, email: "a@b.co" });
    const actor = await resolveActorFromRequest(
      headers({ "x-guest-id": "guest-1", authorization: "Bearer fake" }),
      { verifyAccessToken },
    );
    expect(actor).toEqual({ kind: "user", userId: USER_ID });
    expect(verifyAccessToken).toHaveBeenCalledWith("fake");
    expect(ensureLocalUserForAuth).toHaveBeenCalledWith(USER_ID, {
      email: "a@b.co",
    });
  });

  it("no JWT + guest header → GuestActor", async () => {
    const verifyAccessToken = vi.fn().mockResolvedValue(null);
    const actor = await resolveActorFromRequest(headers({ "x-guest-id": "g-xyz" }), {
      verifyAccessToken,
    });
    expect(actor).toEqual({ kind: "guest", guestId: "g-xyz" });
    expect(verifyAccessToken).not.toHaveBeenCalled();
    expect(ensureLocalUserForAuth).not.toHaveBeenCalled();
  });

  it("Bearer + valid JWT wins over guest header", async () => {
    const verifyAccessToken = vi
      .fn()
      .mockResolvedValue({ sub: USER_ID, email: null });
    const actor = await resolveActorFromRequest(
      headers({
        "x-guest-id": "should-not-use",
        authorization: "Bearer good",
      }),
      { verifyAccessToken },
    );
    expect(actor).toEqual({ kind: "user", userId: USER_ID });
  });

  it("invalid JWT + guest header → GuestActor", async () => {
    const verifyAccessToken = vi.fn().mockResolvedValue(null);
    const actor = await resolveActorFromRequest(
      headers({
        "x-guest-id": "fallback-guest",
        authorization: "Bearer bad",
      }),
      { verifyAccessToken },
    );
    expect(actor).toEqual({ kind: "guest", guestId: "fallback-guest" });
  });

  it("missing both → RequestIdentityError", async () => {
    const verifyAccessToken = vi.fn().mockResolvedValue(null);
    await expect(
      resolveActorFromRequest(headers({}), { verifyAccessToken }),
    ).rejects.toMatchObject({
      name: "RequestIdentityError",
      status: 401,
    });
  });

  it("invalid JWT and no guest → RequestIdentityError", async () => {
    const verifyAccessToken = vi.fn().mockResolvedValue(null);
    await expect(
      resolveActorFromRequest(headers({ authorization: "Bearer x" }), {
        verifyAccessToken,
      }),
    ).rejects.toBeInstanceOf(RequestIdentityError);
  });

  it("does not use x-user-id (ignored if only that header)", async () => {
    const verifyAccessToken = vi.fn().mockResolvedValue(null);
    await expect(
      resolveActorFromRequest(
        headers({ "x-user-id": USER_ID } as Record<string, string>),
        { verifyAccessToken },
      ),
    ).rejects.toBeInstanceOf(RequestIdentityError);
  });

  it("resolvePlayerIdentityForGameRequest maps UserActor", async () => {
    const verifyAccessToken = vi
      .fn()
      .mockResolvedValue({ sub: USER_ID, email: null });
    const id = await resolvePlayerIdentityForGameRequest(
      headers({ authorization: `Bearer t` }),
      { verifyAccessToken },
    );
    expect(id).toEqual({ userId: USER_ID, guestId: null });
  });
});

describe("tryResolveUserIdFromRequest", () => {
  beforeEach(() => {
    vi.mocked(ensureLocalUserForAuth).mockClear();
  });

  it("returns null with no Authorization header", async () => {
    const verifyAccessToken = vi.fn();
    const id = await tryResolveUserIdFromRequest(new Headers(), { verifyAccessToken });
    expect(id).toBeNull();
    expect(verifyAccessToken).not.toHaveBeenCalled();
  });

  it("returns null for invalid token", async () => {
    const verifyAccessToken = vi.fn().mockResolvedValue(null);
    const id = await tryResolveUserIdFromRequest(
      headers({ authorization: "Bearer bad" }),
      { verifyAccessToken },
    );
    expect(id).toBeNull();
  });

  it("returns sub when token verifies", async () => {
    const verifyAccessToken = vi
      .fn()
      .mockResolvedValue({ sub: USER_ID, email: "a@b.co" });
    const id = await tryResolveUserIdFromRequest(
      headers({ authorization: "Bearer good" }),
      { verifyAccessToken },
    );
    expect(id).toBe(USER_ID);
    expect(ensureLocalUserForAuth).toHaveBeenCalled();
  });
});

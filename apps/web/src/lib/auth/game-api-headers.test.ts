import { describe, expect, it } from "vitest";

import { mergeActorAuthHeaders } from "@/lib/auth/game-api-headers";

describe("mergeActorAuthHeaders", () => {
  it("sets guest only when no token", () => {
    const h = new Headers();
    mergeActorAuthHeaders(h, "guest-abc", null);
    expect(h.get("x-guest-id")).toBe("guest-abc");
    expect(h.get("Authorization")).toBeNull();
  });

  it("sets Bearer when token present", () => {
    const h = new Headers();
    mergeActorAuthHeaders(h, "guest-abc", "jwt-here");
    expect(h.get("x-guest-id")).toBe("guest-abc");
    expect(h.get("Authorization")).toBe("Bearer jwt-here");
  });

  it("omits guest header when guest id empty", () => {
    const h = new Headers();
    mergeActorAuthHeaders(h, "", "tok");
    expect(h.get("x-guest-id")).toBeNull();
    expect(h.get("Authorization")).toBe("Bearer tok");
  });
});

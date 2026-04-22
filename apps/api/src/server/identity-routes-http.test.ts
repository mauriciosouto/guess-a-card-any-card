import { describe, expect, it, vi } from "vitest";

import { app } from "@/server/http-app";

vi.mock("@/server/auth/ensure-local-user", () => ({
  ensureLocalUserForAuth: vi.fn().mockResolvedValue(undefined),
}));

describe("single & challenge routes use JWT + guest identity", () => {
  it("POST /api/single/games without Authorization or X-Guest-Id returns 401", async () => {
    const res = await app.request("http://localhost/api/single/games", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: "{}",
    });
    expect(res.status).toBe(401);
    const j = (await res.json()) as { error?: string };
    expect(j.error).toMatch(/Bearer|X-Guest-Id/i);
  });

  it("POST /api/challenges without identity returns 401", async () => {
    const res = await app.request("http://localhost/api/challenges", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ cardId: "any" }),
    });
    expect(res.status).toBe(401);
  });

  it("POST /api/single/games with X-Guest-Id is not rejected for identity (may fail on DB/catalog)", async () => {
    const res = await app.request("http://localhost/api/single/games", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-guest-id": "vitest-guest-identity-123",
      },
      body: "{}",
    });
    expect(res.status).not.toBe(401);
  });

  it("POST /api/challenges with X-Guest-Id is not rejected for identity", async () => {
    const res = await app.request("http://localhost/api/challenges", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-guest-id": "vitest-guest-challenge-456",
      },
      body: JSON.stringify({ cardId: "nonexistent-card-for-catalog" }),
    });
    expect(res.status).not.toBe(401);
  });

});

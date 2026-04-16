import { describe, expect, it } from "vitest";

import { app } from "./http-app";

describe("GET /api/single/cards/search", () => {
  it("returns name suggestions from the runtime catalog (no puzzle service)", async () => {
    const res = await app.request("http://localhost/api/single/cards/search?q=vis");
    expect(res.status).toBe(200);
    const body = (await res.json()) as { names: string[] };
    expect(Array.isArray(body.names)).toBe(true);
    expect(body.names.length).toBeGreaterThan(0);
  });

  it("returns empty names for short query", async () => {
    const res = await app.request("http://localhost/api/single/cards/search?q=vi");
    expect(res.status).toBe(200);
    const body = (await res.json()) as { names: string[] };
    expect(body.names).toEqual([]);
  });
});

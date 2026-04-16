import { Hono } from "hono";
import { afterEach, describe, expect, it } from "vitest";

import { app } from "./http-app";
import { respondWithCatalogSets } from "./respond-with-catalog-sets";
import {
  __clearCatalogForTests,
  getAllSets,
  initCardCatalog,
} from "./services/card-catalog-service";

describe("Lobby GET /sets uses in-memory card catalog", () => {
  afterEach(() => {
    initCardCatalog();
  });

  const paths = ["/api/single/sets", "/api/coop/sets", "/api/competitive/sets"] as const;

  for (const path of paths) {
    it(`${path} returns { sets } matching getAllSets() (not puzzles DB)`, async () => {
      const res = await app.request(`http://localhost${path}`);
      expect(res.status).toBe(200);
      const body = (await res.json()) as { sets: string[] };
      expect(body.sets).toEqual(getAllSets());
      expect(body.sets.length).toBeGreaterThan(50);
      expect(body.sets).toContain("Monarch");
    });
  }

  it("respondWithCatalogSets responds503 when catalog is cleared", async () => {
    __clearCatalogForTests();
    const mini = new Hono().get("/s", (c) => respondWithCatalogSets(c));
    const res = await mini.request("http://localhost/s");
    expect(res.status).toBe(503);
    const j = (await res.json()) as { error?: string };
    expect(j.error).toMatch(/catalog/i);
  });
});

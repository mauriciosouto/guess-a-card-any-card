import { describe, expect, it } from "vitest";

import {
  ART_HEAVY_BLUR_PX,
  ART_LIGHT_BLUR_PX,
  PUZZLE_STEP_COUNT,
  generateStep,
  getShuffledCells,
} from "@/lib/puzzle/deterministicStep";

describe("getShuffledCells", () => {
  it("returns a permutation of 0..15", () => {
    const cells = getShuffledCells("seed-one");
    expect(cells).toHaveLength(16);
    const sorted = [...cells].sort((a, b) => a - b);
    expect(sorted).toEqual(Array.from({ length: 16 }, (_, i) => i));
  });

  it("is stable for the same puzzle seed", () => {
    expect(getShuffledCells("puzzle-xyz")).toEqual(
      getShuffledCells("puzzle-xyz"),
    );
  });

  it("differs for different seeds (almost always)", () => {
    const a = getShuffledCells("a").join(",");
    const b = getShuffledCells("b").join(",");
    expect(a).not.toBe(b);
  });
});

describe("generateStep", () => {
  it("throws for step out of range", () => {
    expect(() => generateStep("s", 0)).toThrow(/1\.\./);
    expect(() => generateStep("s", 16)).toThrow(/1\.\./);
  });

  it("returns PUZZLE_STEP_COUNT as 15", () => {
    expect(PUZZLE_STEP_COUNT).toBe(15);
  });

  it("step 1: all art cells heavy blur; cost and pitch blacked out", () => {
    const { cells, regions, step } = generateStep("fixed-seed", 1);
    expect(step).toBe(1);
    expect(cells).toHaveLength(16);

    const artBlur = regions.filter(
      (r) => r.id.startsWith("art-1-cell-") && r.effects.some((e) => e.type === "blur"),
    );
    expect(artBlur).toHaveLength(16);
    for (const r of artBlur) {
      const blur = r.effects.find((e) => e.type === "blur");
      expect(blur?.intensity).toBe(ART_HEAVY_BLUR_PX);
    }

    expect(regions.some((r) => r.id === "cost-mask")).toBe(true);
    expect(regions.some((r) => r.id === "pitch-mask")).toBe(true);
  });

  it("step 2: cost visible (no cost blackout region)", () => {
    const { regions } = generateStep("fixed-seed", 2);
    expect(regions.some((r) => r.id === "cost-mask")).toBe(false);
    expect(regions.some((r) => r.id === "pitch-mask")).toBe(true);
  });

  it("step 7: pitch visible; slot 5 cell has invert", () => {
    const { cells, regions } = generateStep("fixed-seed", 7);
    expect(regions.some((r) => r.id === "pitch-mask")).toBe(false);

    const physical5 = cells[5];
    const cellRegion = regions.find((r) => r.id === `art-7-cell-${physical5}`);
    expect(cellRegion?.effects.some((e) => e.type === "invert")).toBe(true);
  });

  it("step 15: clears remaining heavy blur cells", () => {
    const { regions } = generateStep("fixed-seed", 15);
    const heavy = regions.filter(
      (r) =>
        r.effects.length === 1 &&
        r.effects[0]?.type === "blur" &&
        r.effects[0]?.intensity === ART_HEAVY_BLUR_PX,
    );
    expect(heavy).toHaveLength(0);
  });

  it("uses light blur constant in scripted steps", () => {
    const { regions } = generateStep("fixed-seed", 3);
    const light = regions.filter(
      (r) =>
        r.effects.some(
          (e) => e.type === "blur" && e.intensity === ART_LIGHT_BLUR_PX,
        ),
    );
    expect(light.length).toBeGreaterThan(0);
  });

  it("always includes blackout for alwaysHidden zones", () => {
    for (let s = 1; s <= PUZZLE_STEP_COUNT; s++) {
      const { regions } = generateStep("s", s);
      expect(regions.some((r) => r.id === "name-mask")).toBe(true);
      expect(regions.some((r) => r.id === "type-mask")).toBe(true);
      expect(regions.some((r) => r.id === "cardInfo-mask")).toBe(true);
    }
  });

  it("is deterministic for same seed and step", () => {
    const a = generateStep("abc", 9);
    const b = generateStep("abc", 9);
    expect(a.cells).toEqual(b.cells);
    expect(JSON.stringify(a.regions)).toBe(JSON.stringify(b.regions));
  });
});

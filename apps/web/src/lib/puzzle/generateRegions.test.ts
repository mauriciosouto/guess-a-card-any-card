import { describe, expect, it } from "vitest";

import { generateRegions } from "@/lib/puzzle/generateRegions";
import { generateStep } from "@/lib/puzzle/deterministicStep";

describe("generateRegions", () => {
  it("matches generateStep(...).regions", () => {
    const seed = "puzzle-regions";
    for (const step of [1, 5, 15]) {
      expect(generateRegions(seed, step)).toEqual(
        generateStep(seed, step).regions,
      );
    }
  });
});

import { createHash } from "node:crypto";

import { describe, expect, it } from "vitest";

import { generateRegions } from "@/lib/puzzle/generateRegions";

/** Fixed UUID-shaped seed — hash must stay stable vs image-guess-admin. */
const GOLDEN_SEED = "a1b2c3d4-e5f6-4789-a012-3456789abcde";

function stableJson(value: unknown): string {
  return JSON.stringify(value);
}

function sha256Hex(s: string): string {
  return createHash("sha256").update(s).digest("hex");
}

describe("generateRegions golden parity", () => {
  it("step 1 vs 15: stable hashes (detect drift from admin)", () => {
    const r1 = generateRegions(GOLDEN_SEED, 1);
    const r15 = generateRegions(GOLDEN_SEED, 15);

    expect(r1.length).toBeGreaterThan(0);
    expect(r15.length).toBeGreaterThan(0);
    expect(r1.length).not.toBe(r15.length);

    expect(sha256Hex(stableJson(r1))).toMatchInlineSnapshot(
      `"5fa73cee5c55b6344b62c1573ea85385bc095dce47d600f918aa3e3ce103312c"`,
    );
    expect(sha256Hex(stableJson(r15))).toMatchInlineSnapshot(
      `"4159fcd95d09e2252d9ab8bc156a7b915660929d18a80cfa64d8599a6a8f6c37"`,
    );
  });

  it("step 1 full snapshot", () => {
    expect(generateRegions(GOLDEN_SEED, 1)).toMatchSnapshot();
  });
});

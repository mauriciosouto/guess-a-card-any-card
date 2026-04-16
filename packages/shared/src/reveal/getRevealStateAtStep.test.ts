import { describe, expect, it } from "vitest";

import { buildRevealPlan } from "./buildRevealPlan";
import { getRevealStateAtStep } from "./getRevealStateAtStep";

describe("getRevealStateAtStep", () => {
  const card = { kind: "attackAction" as const };
  const templateKey = "actionLike" as const;
  const seed = "state-at-step";

  it("totalSteps matches reveal plan length", () => {
    const plan = buildRevealPlan(card, templateKey, seed);
    const s = getRevealStateAtStep(card, templateKey, seed, 1);
    expect(s.totalSteps).toBe(plan.length);
    expect(s.plan).toEqual(plan);
  });

  it("step 1 reveals exactly one zone cumulatively", () => {
    const s = getRevealStateAtStep(card, templateKey, seed, 1);
    expect(s.effectiveStep).toBe(1);
    expect(s.revealed).toHaveLength(1);
    expect(s.unrevealed).toHaveLength(s.totalSteps - 1);
    expect(s.revealed[0]!.step).toBe(1);
  });

  it("step N reveals N zones cumulatively", () => {
    const s0 = getRevealStateAtStep(card, templateKey, seed, 1);
    const n = s0.totalSteps;
    for (let k = 1; k <= n; k++) {
      const s = getRevealStateAtStep(card, templateKey, seed, k);
      expect(s.revealed).toHaveLength(k);
      expect(s.unrevealed).toHaveLength(n - k);
      expect(s.revealed.map((e) => e.id)).toEqual(s.plan.slice(0, k).map((e) => e.id));
    }
  });

  it("last step reveals all candidate zones", () => {
    const n = buildRevealPlan(card, templateKey, seed).length;
    const s = getRevealStateAtStep(card, templateKey, seed, n);
    expect(s.revealed).toHaveLength(n);
    expect(s.unrevealed).toHaveLength(0);
    expect(s.effectiveStep).toBe(n);
  });

  it("clamps high currentStep to totalSteps", () => {
    const n = buildRevealPlan(card, templateKey, seed).length;
    const s = getRevealStateAtStep(card, templateKey, seed, n + 999);
    expect(s.effectiveStep).toBe(n);
    expect(s.revealed).toHaveLength(n);
    expect(s.debug.clamped).toBe(true);
  });

  it("clamps low currentStep to 1 when plan non-empty", () => {
    const s = getRevealStateAtStep(card, templateKey, seed, -5);
    expect(s.effectiveStep).toBe(1);
    expect(s.revealed).toHaveLength(1);
    expect(s.debug.clamped).toBe(true);
  });

  it("is deterministic for same inputs", () => {
    const a = getRevealStateAtStep(card, templateKey, seed, 4);
    const b = getRevealStateAtStep(card, templateKey, seed, 4);
    expect(a).toEqual(b);
  });
});

import { describe, expect, it } from "vitest";

import {
  getBlackoutRegionsFromRevealState,
  getRenderRegionsFromRevealState,
} from "./getRenderRegionsFromRevealState";
import { getRevealStateAtStep } from "./getRevealStateAtStep";

describe("getRenderRegionsFromRevealState", () => {
  const card = { kind: "attackAction" as const };
  const templateKey = "actionLike" as const;
  const seed = "render-regions";

  it("step 1 leaves exactly one visible zone", () => {
    const state = getRevealStateAtStep(card, templateKey, seed, 1);
    const r = getRenderRegionsFromRevealState(state);
    expect(r.visible).toHaveLength(1);
    expect(r.hidden).toHaveLength(state.totalSteps - 1);
    expect(r.visible[0]!.planStep).toBe(1);
  });

  it("last step leaves all plan zones visible; no plan blackouts but always-hidden remains", () => {
    const state0 = getRevealStateAtStep(card, templateKey, seed, 1);
    const n = state0.totalSteps;
    const state = getRevealStateAtStep(card, templateKey, seed, n);
    const r = getRenderRegionsFromRevealState(state);
    expect(r.visible).toHaveLength(n);
    expect(r.hidden).toHaveLength(0);
    expect(r.alwaysHidden.length).toBeGreaterThan(0);
    expect(r.visible.every((v) => v.width > 0 && v.height > 0)).toBe(true);
  });

  it("visible + hidden partition matches reveal state plan length", () => {
    for (const step of [1, 5, 12]) {
      const state = getRevealStateAtStep(card, templateKey, seed, step);
      const r = getRenderRegionsFromRevealState(state);
      expect(r.visible.length + r.hidden.length).toBe(state.plan.length);
      expect(r.meta.totalSteps).toBe(state.totalSteps);
      expect(r.meta.effectiveStep).toBe(state.effectiveStep);
    }
  });

  it("plan-hidden and always-hidden regions use blackout only", () => {
    const state = getRevealStateAtStep(card, templateKey, seed, 3);
    const r = getRenderRegionsFromRevealState(state);
    for (const h of r.hidden) {
      expect(h.effects).toEqual([{ type: "blackout" }]);
      expect(h.id.startsWith("mask-")).toBe(true);
    }
    for (const h of r.alwaysHidden) {
      expect(h.effects).toEqual([{ type: "blackout" }]);
      expect(h.id.startsWith("mask-always-")).toBe(true);
    }
    for (const h of r.invalidForKind) {
      expect(h.effects).toEqual([{ type: "blackout" }]);
      expect(h.id.startsWith("mask-inactive-")).toBe(true);
    }
  });

  it("attackAction actionLike masks inactive defense stat slot", () => {
    const state = getRevealStateAtStep(card, templateKey, seed, 1);
    const r = getRenderRegionsFromRevealState(state);
    expect(r.invalidForKind.map((x) => x.id)).toContain("mask-inactive-defense");
  });

  it("getBlackoutRegionsFromRevealState merges hidden, always-hidden, and invalid-for-kind", () => {
    const state = getRevealStateAtStep(card, templateKey, seed, 2);
    const r = getRenderRegionsFromRevealState(state);
    const merged = getBlackoutRegionsFromRevealState(state);
    expect(merged).toEqual([...r.hidden, ...r.alwaysHidden, ...r.invalidForKind]);
  });

  it("getBlackoutRegionsFromRevealState can omit only always-hidden", () => {
    const state = getRevealStateAtStep(card, templateKey, seed, 2);
    const r = getRenderRegionsFromRevealState(state);
    const noAlways = getBlackoutRegionsFromRevealState(state, { includeAlwaysHidden: false });
    expect(noAlways).toEqual([...r.hidden, ...r.invalidForKind]);
    expect(r.alwaysHidden.length).toBeGreaterThan(0);
  });

  it("getBlackoutRegionsFromRevealState can omit persistent masks for terminal full bleed", () => {
    const state = getRevealStateAtStep(card, templateKey, seed, 2);
    const r = getRenderRegionsFromRevealState(state);
    const playOnly = getBlackoutRegionsFromRevealState(state, {
      includeAlwaysHidden: false,
      includeInvalidForKindMasks: false,
    });
    expect(playOnly).toEqual(r.hidden);
  });

  it("output is deterministic for same reveal state", () => {
    const state = getRevealStateAtStep(card, templateKey, seed, 7);
    const a = getRenderRegionsFromRevealState(state);
    const b = getRenderRegionsFromRevealState(state);
    expect(a).toEqual(b);
  });

  it("visible ids match revealed plan ids", () => {
    const state = getRevealStateAtStep(card, templateKey, seed, 4);
    const r = getRenderRegionsFromRevealState(state);
    expect(r.visible.map((v) => v.id)).toEqual(state.revealed.map((e) => e.id));
  });
});

import { describe, expect, it } from "vitest";

import { buildRevealPlan } from "./buildRevealPlan";
import { getCandidateZones } from "./getCandidateZones";
import { getRenderRegionsFromRevealState } from "./getRenderRegionsFromRevealState";
import { getRevealStateAtStep } from "./getRevealStateAtStep";

describe("reveal engine plan vs always-hidden", () => {
  const card = { kind: "attackAction" as const };
  const templateKey = "actionLike" as const;
  const seed = "plan-vs-mask";

  it("reveal plan never includes name or footer ids", () => {
    const plan = buildRevealPlan(card, templateKey, seed);
    const ids = new Set(plan.map((e) => e.id));
    expect(ids.has("name")).toBe(false);
    expect(ids.has("footer")).toBe(false);
  });

  it("getCandidateZones excludes name and footer", () => {
    const zones = getCandidateZones(card, templateKey);
    expect(zones.some((z) => z.id === "name" || z.id === "footer")).toBe(false);
  });

  it("plan length matches playable candidate count only", () => {
    const n = getCandidateZones(card, templateKey).length;
    expect(buildRevealPlan(card, templateKey, seed)).toHaveLength(n);
  });

  it("name and footer are always present as blackout regions at every step", () => {
    const n = buildRevealPlan(card, templateKey, seed).length;
    for (const step of [1, Math.ceil(n / 2), n]) {
      const state = getRevealStateAtStep(card, templateKey, seed, step);
      const r = getRenderRegionsFromRevealState(state);
      const alwaysIds = r.alwaysHidden.map((x) => x.id).sort();
      expect(alwaysIds).toContain("mask-always-name");
      expect(alwaysIds).toContain("mask-always-footer");
      for (const reg of r.alwaysHidden) {
        expect(reg.effects).toEqual([{ type: "blackout" }]);
      }
    }
  });

  it("step progression reveals cumulative playable zones; plan masks shrink", () => {
    const n = buildRevealPlan(card, templateKey, seed).length;
    for (let k = 1; k <= n; k++) {
      const state = getRevealStateAtStep(card, templateKey, seed, k);
      const r = getRenderRegionsFromRevealState(state);
      expect(r.visible).toHaveLength(k);
      expect(r.hidden).toHaveLength(n - k);
      expect(r.alwaysHidden.length).toBeGreaterThanOrEqual(2);
    }
  });
});

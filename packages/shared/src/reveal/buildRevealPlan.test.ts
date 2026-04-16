import { describe, expect, it } from "vitest";

import type { ZonedCandidateEntry } from "./assignZonePhases";
import { buildRevealPlan, isB2RevealZone } from "./buildRevealPlan";
import { getCandidateZones } from "./getCandidateZones";

describe("buildRevealPlan", () => {
  const card = { kind: "attackAction" as const };
  const templateKey = "actionLike" as const;

  it("plan length matches candidate zone count", () => {
    const n = getCandidateZones(card, templateKey).length;
    const plan = buildRevealPlan(card, templateKey, "len-seed");
    expect(plan).toHaveLength(n);
  });

  it("is deterministic for same seed + input", () => {
    const a = buildRevealPlan(card, templateKey, "stable-seed-xyz");
    const b = buildRevealPlan(card, templateKey, "stable-seed-xyz");
    expect(a.map((e) => e.id)).toEqual(b.map((e) => e.id));
 });

  it("different seeds can change ordering", () => {
    const a = buildRevealPlan(card, templateKey, "reveal-alpha-001");
    const b = buildRevealPlan(card, templateKey, "reveal-beta-002");
    expect(a.map((e) => e.id).join()).not.toBe(b.map((e) => e.id).join());
  });

  it("strict phase blocks: all early before mid before late", () => {
    const plan = buildRevealPlan(card, templateKey, "phase-order");
    const phases = plan.map((e) => e.phase);
    const firstMid = phases.indexOf("mid");
    const lastEarly = phases.lastIndexOf("early");
    const firstLate = phases.indexOf("late");
    const lastMid = phases.lastIndexOf("mid");
    if (firstMid !== -1 && lastEarly !== -1) expect(lastEarly).toBeLessThan(firstMid);
    if (firstLate !== -1 && lastMid !== -1) expect(lastMid).toBeLessThan(firstLate);
  });

  it("no duplicate ids", () => {
    const plan = buildRevealPlan({ kind: "hero" }, "hero", "dup-check");
    const ids = plan.map((e) => e.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("B2 is always in the final 2–3 steps (1-based)", () => {
    const cases: Array<{ kind: (typeof card)["kind"]; template: typeof templateKey }> = [
      { kind: "attackAction", template: "actionLike" },
      { kind: "hero", template: "hero" },
      { kind: "weapon", template: "weaponEquipment" },
      { kind: "token", template: "weaponEquipment" },
    ];
    for (const { kind, template } of cases) {
      for (const seed of ["b2-a", "b2-b", "b2-c", "b2-d"]) {
        const plan = buildRevealPlan({ kind }, template, seed);
        const n = plan.length;
        const b2 = plan.find((e) => e.isB2);
        expect(b2, `${kind}/${template}/${seed}`).toBeDefined();
        const step = b2!.step;
        expect(step, `${kind}/${template}/${seed}`).toBeGreaterThanOrEqual(Math.max(1, n - 2));
        expect(step, `${kind}/${template}/${seed}`).toBeLessThanOrEqual(n);
      }
    }
  });

  it("marks isB2 only on B2 art cell", () => {
    const plan = buildRevealPlan(card, templateKey, "b2-flag");
    const b2Rows = plan.filter((e) => e.isB2);
    expect(b2Rows).toHaveLength(1);
    expect(b2Rows[0]!.metadata?.row).toBe(1);
    expect(b2Rows[0]!.metadata?.col).toBe(1);
  });
});

describe("isB2RevealZone", () => {
  it("detects art cell at row 1 col 1", () => {
    const z = {
      id: "x",
      type: "art-cell",
      rect: { x: 0, y: 0, width: 1, height: 1 },
      phase: "late",
      metadata: { row: 1, col: 1 },
    } satisfies ZonedCandidateEntry;
    expect(isB2RevealZone(z)).toBe(true);
  });
});

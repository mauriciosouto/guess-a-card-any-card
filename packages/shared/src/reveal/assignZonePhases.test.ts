import { describe, expect, it } from "vitest";

import {
  assignZonePhases,
  HERO_PHASE_MAP_3x5,
  isB2Cell,
} from "./assignZonePhases";
import { getCandidateZones } from "./getCandidateZones";

describe("isB2Cell", () => {
  it("identifies spreadsheet B2 as row 1 col 1 (0-indexed)", () => {
    expect(isB2Cell(1, 1)).toBe(true);
    expect(isB2Cell(0, 1)).toBe(false);
    expect(isB2Cell(1, 0)).toBe(false);
  });
});

describe("assignZonePhases", () => {
  it("assigns a phase to every candidate zone", () => {
    const base = getCandidateZones({ kind: "attackAction" }, "actionLike");
    const zoned = assignZonePhases({ kind: "attackAction" }, "actionLike", base);
    expect(zoned).toHaveLength(base.length);
    for (const z of zoned) {
      expect(z.phase).toMatch(/^(early|mid|late)$/);
      expect(z.phaseDebug?.rule).toBeTruthy();
      expect(z.phaseDebug?.templateKey).toBe("actionLike");
    }
  });

  it("normal3x3: B2 (center) is always late", () => {
    const base = getCandidateZones({ kind: "attackAction" }, "actionLike");
    const zoned = assignZonePhases({ kind: "attackAction" }, "actionLike", base);
    const b2 = zoned.find(
      (z) => z.type === "art-cell" && z.metadata?.row === 1 && z.metadata?.col === 1,
    );
    expect(b2?.phase).toBe("late");
    expect(b2?.phaseDebug?.rule).toBe("normal-art-b2-late");
  });

  it("normal: type line is mid", () => {
    const base = getCandidateZones({ kind: "instant" }, "actionLike");
    const zoned = assignZonePhases({ kind: "instant" }, "actionLike", base);
    expect(zoned.find((z) => z.type === "type")?.phase).toBe("mid");
  });

  it("normal: corners early, some edge cells mid", () => {
    const base = getCandidateZones({ kind: "defenseReaction" }, "actionLike");
    const zoned = assignZonePhases({ kind: "defenseReaction" }, "actionLike", base);
    const corner = zoned.find(
      (z) => z.type === "art-cell" && z.metadata?.row === 0 && z.metadata?.col === 0,
    );
    const edgeMid = zoned.find(
      (z) => z.type === "art-cell" && z.metadata?.row === 0 && z.metadata?.col === 1,
    );
    expect(corner?.phase).toBe("early");
    expect(edgeMid?.phase).toBe("mid");
  });

  it("text slices follow [mid, mid, early, late] — first textual strip is not EARLY phase", () => {
    const base = getCandidateZones({ kind: "weapon" }, "weaponEquipment");
    const zoned = assignZonePhases({ kind: "weapon" }, "weaponEquipment", base);
    const texts = zoned.filter((z) => z.type === "text-slice").sort((a, b) => (a.metadata?.sliceIndex ?? 0) - (b.metadata?.sliceIndex ?? 0));
    expect(texts.map((t) => t.phase)).toEqual(["mid", "mid", "early", "late"]);
    expect(texts[0]?.phase).toBe("mid");
    expect(texts[1]?.phase).toBe("mid");
  });

  it("HERO_PHASE_MAP_3x5 is 5×3 and B2 is late", () => {
    expect(HERO_PHASE_MAP_3x5).toHaveLength(5);
    for (const row of HERO_PHASE_MAP_3x5) {
      expect(row).toHaveLength(3);
    }
    expect(HERO_PHASE_MAP_3x5[1]![1]).toBe("late");
  });

  it("hero: every art cell phase matches HERO_PHASE_MAP_3x5", () => {
    const base = getCandidateZones({ kind: "hero" }, "hero");
    const zoned = assignZonePhases({ kind: "hero" }, "hero", base);
    const art = zoned.filter((z) => z.type === "art-cell");
    expect(art).toHaveLength(15);
    for (const z of art) {
      const r = z.metadata?.row;
      const c = z.metadata?.col;
      expect(r).toBeDefined();
      expect(c).toBeDefined();
      const expected = HERO_PHASE_MAP_3x5[r!]![c!];
      expect(z.phase).toBe(expected);
      expect(z.phaseDebug?.rule).toBe(`hero-art-map-r${r}c${c}`);
    }
  });

  it("hero: B2 late, type late, intellect mid, life late", () => {
    const base = getCandidateZones({ kind: "hero" }, "hero");
    const zoned = assignZonePhases({ kind: "hero" }, "hero", base);
    const b2 = zoned.find(
      (z) => z.type === "art-cell" && z.metadata?.row === 1 && z.metadata?.col === 1,
    );
    expect(b2?.phase).toBe("late");
    expect(b2?.phaseDebug?.rule).toBe("hero-art-map-r1c1");
    expect(zoned.find((z) => z.type === "type")?.phase).toBe("late");
    expect(zoned.find((z) => z.id === "intellect")?.phase).toBe("mid");
    expect(zoned.find((z) => z.id === "life")?.phase).toBe("late");
  });

  it("hero: art phases are mixed (not only early outside B2)", () => {
    const base = getCandidateZones({ kind: "hero" }, "hero");
    const zoned = assignZonePhases({ kind: "hero" }, "hero", base);
    const art = zoned.filter((z) => z.type === "art-cell");
    const phases = new Set(art.map((a) => a.phase));
    expect(phases.has("early")).toBe(true);
    expect(phases.has("mid")).toBe(true);
    expect(phases.has("late")).toBe(true);
  });

  it("attackAction: cost early, attack late", () => {
    const base = getCandidateZones({ kind: "attackAction" }, "actionLike");
    const zoned = assignZonePhases({ kind: "attackAction" }, "actionLike", base);
    expect(zoned.find((z) => z.id === "cost")?.phase).toBe("early");
    expect(zoned.find((z) => z.id === "attack")?.phase).toBe("late");
  });
});

import { describe, expect, it } from "vitest";

import { getCandidateZones, getInvalidStatBlackoutRegions } from "./getCandidateZones";

describe("getCandidateZones", () => {
  it("actionLike + attackAction: art9 + text 4 + type + cost pitch attack (no defense)", () => {
    const z = getCandidateZones({ kind: "attackAction" }, "actionLike");
    expect(z.filter((x) => x.type === "art-cell")).toHaveLength(9);
    expect(z.filter((x) => x.type === "text-slice")).toHaveLength(4);
    expect(z.filter((x) => x.type === "type")).toHaveLength(1);
    expect(z.filter((x) => x.type === "stat").map((s) => s.id).sort()).toEqual(
      ["attack", "cost", "pitch"].sort(),
    );
    expect(z.some((x) => x.id === "name" || x.id === "footer")).toBe(false);
  });

  it("actionLike + nonAttackAction: no attack stat", () => {
    const z = getCandidateZones({ kind: "nonAttackAction" }, "actionLike");
    expect(z.filter((x) => x.type === "stat").map((s) => s.id).sort()).toEqual(
      ["cost", "pitch"].sort(),
    );
  });

  it("hero + hero: visual cells + type + intellect + life; no text slices", () => {
    const z = getCandidateZones({ kind: "hero" }, "hero");
    expect(z.filter((x) => x.type === "art-cell")).toHaveLength(15);
    expect(z.filter((x) => x.type === "text-slice")).toHaveLength(0);
    expect(z.filter((x) => x.type === "stat").map((s) => s.id).sort()).toEqual(
      ["intellect", "life"].sort(),
    );
  });

  it("weapon + weaponEquipment: attack only among stats", () => {
    const z = getCandidateZones({ kind: "weapon" }, "weaponEquipment");
    expect(z.filter((x) => x.type === "stat").map((s) => s.id)).toEqual(["attack"]);
  });

  it("token + weaponEquipment: same candidates as weapon", () => {
    const w = getCandidateZones({ kind: "weapon" }, "weaponEquipment");
    const t = getCandidateZones({ kind: "token" }, "weaponEquipment");
    expect(t.map((x) => x.id)).toEqual(w.map((x) => x.id));
  });

  it("equipment + weaponEquipment: defense only among stats", () => {
    const z = getCandidateZones({ kind: "equipment" }, "weaponEquipment");
    expect(z.filter((x) => x.type === "stat").map((s) => s.id)).toEqual(["defense"]);
  });

  it("is stable across calls", () => {
    const a = getCandidateZones({ kind: "instant" }, "actionLike");
    const b = getCandidateZones({ kind: "instant" }, "actionLike");
    expect(a).toEqual(b);
  });

  it("getInvalidStatBlackoutRegions lists template stats not valid for kind", () => {
    const inactive = getInvalidStatBlackoutRegions({ kind: "attackAction" }, "actionLike");
    expect(inactive.map((r) => r.id).sort()).toEqual(["mask-inactive-defense"]);
  });

  it("getInvalidStatBlackoutRegions masks attack slot for equipment on weaponEquipment", () => {
    const inactive = getInvalidStatBlackoutRegions({ kind: "equipment" }, "weaponEquipment");
    expect(inactive.map((r) => r.id)).toContain("mask-inactive-attack");
  });
});

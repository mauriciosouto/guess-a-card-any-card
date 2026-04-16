import { describe, expect, it } from "vitest";

import { actionLikeTemplate, heroTemplate } from "../config/cardTemplates";
import {
  expandGridCells,
  expandTextBlockRects,
  expandTextSlices,
  findZone,
  getArtGridSpec,
  getTemplate,
  listCandidateZones,
  resolveCardTemplate,
} from "./cardTemplateGeometry";

describe("cardTemplateGeometry", () => {
  it("getArtGridSpec returns artGrid for actionLike", () => {
    const g = getArtGridSpec(actionLikeTemplate);
    expect(g.rows).toBe(3);
    expect(g.cols).toBe(3);
  });

  it("getArtGridSpec returns visualGrid for hero", () => {
    const g = getArtGridSpec(heroTemplate);
    expect(g.rows).toBe(5);
    expect(g.cols).toBe(3);
  });

  it("expandGridCells produces rows*cols entries from template only", () => {
    const cells = expandGridCells(getArtGridSpec(getTemplate("actionLike")));
    expect(cells).toHaveLength(9);
    expect(cells[0]!.index).toBe(0);
    expect(cells[8]!.row).toBe(2);
    expect(cells[8]!.col).toBe(2);
  });

  it("expandTextSlices uses vertical columns from template slices count", () => {
    const slices = expandTextSlices(getTemplate("actionLike"));
    expect(slices).toHaveLength(4);
    const z = findZone(actionLikeTemplate, "textBlock")!;
    const zw = z.rect!.width * 100;
    const zh = z.rect!.height * 100;
    const sumW = slices.reduce((s, x) => s + x.width, 0);
    expect(sumW).toBeCloseTo(zw, 5);
    for (const s of slices) {
      expect(s.height).toBeCloseTo(zh, 5);
    }
  });

  it("expandTextBlockRects matches template fractions", () => {
    const rects = expandTextBlockRects(actionLikeTemplate);
    expect(rects).toHaveLength(4);
    const z = findZone(actionLikeTemplate, "textBlock")!.rect!;
    expect(rects[0]!.rect.x).toBe(z.x);
    expect(rects[3]!.rect.x + rects[3]!.rect.width).toBeCloseTo(z.x + z.width, 10);
  });

  it("resolveCardTemplate accepts key or object", () => {
    expect(resolveCardTemplate("hero").key).toBe("hero");
    expect(resolveCardTemplate({ cardTemplateKey: "weaponEquipment" }).key).toBe("weaponEquipment");
  });

  it("listCandidateZones flattens rects, grid cells, and text slices", () => {
    const zones = listCandidateZones(actionLikeTemplate);
    const gridCells = zones.filter((z) => z.role === "gridCell");
    const textSlices = zones.filter((z) => z.role === "textSlice");
    const rects = zones.filter((z) => z.role === "rect");
    expect(gridCells).toHaveLength(9);
    expect(textSlices).toHaveLength(4);
    expect(rects.map((r) => r.zoneId).sort()).toEqual(
      ["attack", "cost", "defense", "footer", "name", "pitch", "type"].sort(),
    );
  });

  it("hero has no textBlock slices", () => {
    expect(expandTextSlices(heroTemplate)).toHaveLength(0);
  });

  it("listCandidateZones for hero uses visualGrid cells only", () => {
    const zones = listCandidateZones(heroTemplate);
    expect(zones.filter((z) => z.role === "gridCell")).toHaveLength(15);
    expect(zones.filter((z) => z.role === "textSlice")).toHaveLength(0);
    expect(zones.filter((z) => z.zoneId === "visualGrid")).toHaveLength(15);
  });
});

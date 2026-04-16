/**
 * Geometry derived only from `apps/web/src/config/cardTemplates.ts`.
 * Do not duplicate coordinates here — read zones from the static templates.
 */

import {
  cardTemplates,
  type CardTemplate,
  type CardTemplateKey,
  type GridRect,
  type Rect,
  type ZoneConfig,
  type ZoneId,
} from "../config/cardTemplates";

/** Pass-through or object shape for future card API fields. */
export type CardTemplateResolvable = CardTemplateKey | { cardTemplateKey: CardTemplateKey };

export function getTemplate(key: CardTemplateKey): CardTemplate {
  return cardTemplates[key];
}

/** Resolve the layout template for a card (by explicit template key until the API maps card type → key). */
export function resolveCardTemplate(input: CardTemplateResolvable): CardTemplate {
  const key = typeof input === "string" ? input : input.cardTemplateKey;
  return getTemplate(key);
}

export function findZone(template: CardTemplate, id: ZoneId): ZoneConfig | undefined {
  return template.zones.find((z) => z.id === id);
}

/** Template uses 0–1 fractions; overlays use the same 0–100 percent space as legacy FabZone. */
export function fractionRectToPercent(r: Rect): {
  x: number;
  y: number;
  width: number;
  height: number;
} {
  return {
    x: r.x * 100,
    y: r.y * 100,
    width: r.width * 100,
    height: r.height * 100,
  };
}

/** Art area: `artGrid` (action / weapon) or `visualGrid` (hero). */
export function getArtGridSpec(template: CardTemplate): GridRect {
  const art = findZone(template, "artGrid");
  if (art?.grid) return art.grid;
  const vis = findZone(template, "visualGrid");
  if (vis?.grid) return vis.grid;
  throw new Error(`Template "${template.key}" has no artGrid or visualGrid`);
}

export type GridCellRect = {
  index: number;
  row: number;
  col: number;
  /** 0–1 card space (same units as template `rect`). */
  rect: Rect;
};

export type GridCellPercents = {
  index: number;
  row: number;
  col: number;
  x: number;
  y: number;
  width: number;
  height: number;
};

/**
 * Exact `rows` × `cols` partition of the template grid rect (no gutter — for candidates / engine).
 */
export function expandGridCellRects(grid: GridRect): GridCellRect[] {
  const { rows, cols, x: fx, y: fy, width: fw, height: fh } = grid;
  const cellW = fw / cols;
  const cellH = fh / rows;
  const out: GridCellRect[] = [];
  let index = 0;
  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) {
      out.push({
        index,
        row,
        col,
        rect: {
          x: fx + col * cellW,
          y: fy + row * cellH,
          width: cellW,
          height: cellH,
        },
      });
      index++;
    }
  }
  return out;
}

/**
 * Cells from template `rows` × `cols` only — no invented grid size.
 * `insetFraction` is a fraction of the smaller local cell dimension (legacy preview math).
 */
export function expandGridCells(grid: GridRect, insetFraction = 0.06): GridCellPercents[] {
  const { rows, cols, x: fx, y: fy, width: fw, height: fh } = grid;
  const zx = fx * 100;
  const zy = fy * 100;
  const zw = fw * 100;
  const zh = fh * 100;
  const cw = 100 / cols;
  const ch = 100 / rows;
  const inset = insetFraction * Math.min(cw, ch);
  const out: GridCellPercents[] = [];
  let index = 0;
  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) {
      const lx = col * cw + inset;
      const ly = row * ch + inset;
      const lw = cw - inset * 2;
      const lh = ch - inset * 2;
      out.push({
        index,
        row,
        col,
        x: zx + (lx / 100) * zw,
        y: zy + (ly / 100) * zh,
        width: (lw / 100) * zw,
        height: (lh / 100) * zh,
      });
      index++;
    }
  }
  return out;
}

export type TextSliceRect = {
  index: number;
  rect: Rect;
};

export type TextSlicePercents = {
  index: number;
  x: number;
  y: number;
  width: number;
  height: number;
};

/**
 * Vertical columns: `textBlock.slices` equal-width bands inside `textBlock.rect` (template only).
 */
export function expandTextBlockRects(template: CardTemplate): TextSliceRect[] {
  const z = findZone(template, "textBlock");
  if (!z?.rect || z.slices == null || z.slices < 1) return [];
  const { x, y, width, height } = z.rect;
  const n = z.slices;
  const sliceW = width / n;
  const out: TextSliceRect[] = [];
  for (let i = 0; i < n; i++) {
    out.push({
      index: i,
      rect: {
        x: x + i * sliceW,
        y,
        width: sliceW,
        height,
      },
    });
  }
  return out;
}

export function expandTextSlices(template: CardTemplate): TextSlicePercents[] {
  return expandTextBlockRects(template).map((s) => ({
    index: s.index,
    ...fractionRectToPercent(s.rect),
  }));
}

export type CandidateZoneRole = "rect" | "gridCell" | "textSlice";

/** Normalized candidate region for overlays, debug UIs, and a future Reveal Engine. */
export type CandidateZone = {
  id: string;
  zoneId: ZoneId;
  role: CandidateZoneRole;
  /** 0–1 card space (template units). */
  rect: Rect;
  row?: number;
  col?: number;
  sliceIndex?: number;
  alwaysHidden?: boolean;
};

/**
 * Flat list of atomic zones: rect stats, expanded grid cells, expanded text columns.
 * Order follows `template.zones`; cells are row-major; text slices left-to-right.
 */
export function listCandidateZones(template: CardTemplate): CandidateZone[] {
  const out: CandidateZone[] = [];
  for (const z of template.zones) {
    if (z.id === "artGrid" || z.id === "visualGrid") {
      if (!z.grid) continue;
      for (const c of expandGridCellRects(z.grid)) {
        out.push({
          id: `${z.id}:cell:${c.index}`,
          zoneId: z.id,
          role: "gridCell",
          rect: c.rect,
          row: c.row,
          col: c.col,
        });
      }
      continue;
    }
    if (z.id === "textBlock") {
      for (const s of expandTextBlockRects(template)) {
        out.push({
          id: `textBlock:slice:${s.index}`,
          zoneId: "textBlock",
          role: "textSlice",
          rect: s.rect,
          sliceIndex: s.index,
        });
      }
      continue;
    }
    if (z.rect) {
      out.push({
        id: z.id,
        zoneId: z.id,
        role: "rect",
        rect: z.rect,
        alwaysHidden: z.alwaysHidden,
      });
    }
  }
  return out;
}

/** Zones with a `rect` (not grid) for masking / stats, excluding pure layout containers handled elsewhere. */
export function listRectZones(template: CardTemplate): ZoneConfig[] {
  return template.zones.filter(
    (z) =>
      z.rect &&
      z.id !== "artGrid" &&
      z.id !== "visualGrid" &&
      z.id !== "textBlock",
  );
}

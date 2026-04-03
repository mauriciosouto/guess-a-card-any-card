import { createSeededRandom } from "@/lib/utils/seededRandom";

import type { Effect } from "@/lib/puzzle/effects/types";
import type { Region } from "@/lib/puzzle/regionTypes";
import type { FabZone } from "@/lib/puzzle/zones/fabZones";
import { FAB_ZONES } from "@/lib/puzzle/zones/fabZones";

/** Stored steps per puzzle (DB / UI). */
export const PUZZLE_STEP_COUNT = 15;

const ART_COLS = 4;
const ART_ROWS = 4;

/** Full-zone art blur (step 1). */
export const ART_HEAVY_BLUR_PX = 28;
/** Per-cell light blur in later steps. */
export const ART_LIGHT_BLUR_PX = 6;

const ROTATE_180 = 180 as const;

export type DeterministicStepResult = {
  step: number;
  /** Permutation of `0..15`: reveal-order slot *k* maps to physical cell index `cells[k]`. */
  cells: number[];
  regions: Region[];
};

/**
 * Fisher–Yates shuffle of `[0,…,15]`; stable for a given `seed`.
 */
export function getShuffledCells(seed: string): number[] {
  const rand = createSeededRandom(`${seed}:cells:order`);
  const arr = Array.from({ length: 16 }, (_, i) => i);
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    const t = arr[i]!;
    arr[i] = arr[j]!;
    arr[j] = t;
  }
  return arr;
}

function localRectToCard(
  zone: FabZone,
  lx: number,
  ly: number,
  lw: number,
  lh: number,
): Pick<Region, "x" | "y" | "width" | "height"> {
  return {
    x: zone.x + (lx / 100) * zone.width,
    y: zone.y + (ly / 100) * zone.height,
    width: (lw / 100) * zone.width,
    height: (lh / 100) * zone.height,
  };
}

function fullZoneBlackout(zone: FabZone, idSuffix: string): Region {
  return {
    id: `${zone.id}-${idSuffix}`,
    x: zone.x,
    y: zone.y,
    width: zone.width,
    height: zone.height,
    effects: [{ type: "blackout" }],
  };
}

function heavyBlurEffects(): Effect[] {
  return [{ type: "blur", intensity: ART_HEAVY_BLUR_PX }];
}

function lightBlurEffects(): Effect[] {
  return [{ type: "blur", intensity: ART_LIGHT_BLUR_PX }];
}

function lightBlurRotateEffects(): Effect[] {
  return [
    { type: "blur", intensity: ART_LIGHT_BLUR_PX },
    { type: "rotate", intensity: ROTATE_180 },
  ];
}

/**
 * Physical cell index `0..15` for reveal-order slot `slot` (`cells` from `getShuffledCells`).
 */
function phy(cells: number[], slot: number): number {
  return cells[slot]!;
}

/**
 * Full 16-cell effect stacks for global `step` (1-based), recomputed from scratch.
 */
function cellEffectsForStep(cells: number[], step: number): Effect[][] {
  const p = (slot: number) => phy(cells, slot);
  const out: Effect[][] = Array.from({ length: 16 }, () => heavyBlurEffects());

  if (step <= 1) {
    return out;
  }

  // Steps 2+: still all heavy until per-slot overrides below.
  if (step >= 3) {
    out[p(0)] = [];
    out[p(1)] = [{ type: "invert", intensity: 1 }];
    out[p(2)] = lightBlurEffects();
  }

  if (step >= 4) {
    out[p(0)] = [];
    out[p(3)] = [];
    out[p(1)] = [{ type: "invert", intensity: 1 }];
    out[p(2)] = lightBlurEffects();
  }

  if (step >= 5) {
    out[p(4)] = [{ type: "rotate", intensity: ROTATE_180 }];
  }

  if (step >= 7) {
    out[p(5)] = [{ type: "invert", intensity: 1 }];
  }

  if (step >= 8) {
    out[p(6)] = [];
  }

  if (step >= 9) {
    out[p(7)] = [];
    out[p(1)] = [];
  }

  if (step >= 10) {
    out[p(8)] = [];
    out[p(2)] = [];
  }

  if (step >= 11) {
    out[p(9)] = [];
  }

  if (step >= 12) {
    out[p(10)] = [];
    out[p(4)] = [];
  }

  if (step >= 13) {
    out[p(11)] = [];
    out[p(12)] = lightBlurRotateEffects();
  }

  if (step >= 14) {
    out[p(12)] = [];
    out[p(13)] = lightBlurRotateEffects();
  }

  if (step >= 15) {
    out[p(14)] = [];
    out[p(13)] = [];
    for (let i = 0; i < 16; i++) {
      const fx = out[i];
      if (
        fx.length === 1 &&
        fx[0]!.type === "blur" &&
        fx[0]!.intensity === ART_HEAVY_BLUR_PX
      ) {
        out[i] = [];
      }
    }
  }

  return out;
}

function artZone(): FabZone {
  const z = FAB_ZONES.find((x) => x.id === "art");
  if (!z) {
    throw new Error("FAB_ZONES missing art");
  }
  return z;
}

function buildArtCellRegions(
  step: number,
  cellEffects: Effect[][],
): Region[] {
  const zone = artZone();
  const cw = 100 / ART_COLS;
  const ch = 100 / ART_ROWS;
  const inset = 0.03 * Math.min(cw, ch);
  const regions: Region[] = [];

  for (let idx = 0; idx < 16; idx++) {
    const row = Math.floor(idx / ART_COLS);
    const col = idx % ART_COLS;
    const lx = col * cw + inset;
    const ly = row * ch + inset;
    const lw = cw - inset * 2;
    const lh = ch - inset * 2;
    const geom = localRectToCard(zone, lx, ly, lw, lh);
    const effects = cellEffects[idx]!;
    if (effects.length === 0) {
      continue;
    }
    regions.push({
      id: `art-${step}-cell-${idx}`,
      ...geom,
      effects,
    });
  }

  return regions;
}

function statZoneBlackout(
  zoneId: string,
  step: number,
): { blackout: boolean; idSuffix: string } {
  if (zoneId === "cost") {
    return { blackout: step < 2, idSuffix: "mask" };
  }
  if (zoneId === "defense") {
    return { blackout: step < 6, idSuffix: "mask" };
  }
  if (zoneId === "attack") {
    return { blackout: step < 11, idSuffix: "mask" };
  }
  if (zoneId === "pitch") {
    return { blackout: step < 7, idSuffix: "mask" };
  }
  return { blackout: false, idSuffix: "mask" };
}

/**
 * Full overlay state for one global step from **`seed` + `step` only** (no prior-step state).
 */
export function generateStep(seed: string, step: number): DeterministicStepResult {
  if (step < 1 || step > PUZZLE_STEP_COUNT) {
    throw new Error(
      `step must be 1..${PUZZLE_STEP_COUNT}, got ${step}`,
    );
  }

  const cells = getShuffledCells(seed);
  const cellFx = cellEffectsForStep(cells, step);
  const regions: Region[] = [];

  for (const zone of FAB_ZONES) {
    if (zone.alwaysHidden) {
      regions.push(fullZoneBlackout(zone, "mask"));
      continue;
    }

    if (zone.id === "art") {
      regions.push(...buildArtCellRegions(step, cellFx));
      continue;
    }

    const { blackout, idSuffix } = statZoneBlackout(zone.id, step);
    if (blackout) {
      regions.push(fullZoneBlackout(zone, idSuffix));
    }
  }

  return { step, cells, regions };
}

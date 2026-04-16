import type { Effect } from "./effects/types";

export type Region = {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  /** 1–2 visual effects (generation caps at 2). */
  effects: Effect[];
  /** Stack order when multiple overlays share the same tile. */
  zIndex?: number;
};

/** Percent-space overlay rects (e.g. blackout regions from the reveal engine). */
export type RegionBasedStep = {
  step: number;
  regions: Region[];
};

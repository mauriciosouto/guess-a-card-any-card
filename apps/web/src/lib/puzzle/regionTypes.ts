import type { Effect } from "@/lib/puzzle/effects/types";

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

/** Frontend preview: regions from `generateRegions` (FAB zones + art grid). */
export type RegionBasedStep = {
  step: number;
  regions: Region[];
};

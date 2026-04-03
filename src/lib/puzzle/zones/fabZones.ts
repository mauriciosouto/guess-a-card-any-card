export type FabZone = {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  /** If true, zone is never revealed (always blackout). */
  alwaysHidden?: boolean;
  /** Blackout until `step >= hiddenUntilStep`, then fully visible (no overlay). */
  hiddenUntilStep?: number;
};

/**
 * Semantic FAB card layout (percent of card frame, top-left origin).
 */
export const FAB_ZONES: FabZone[] = [
  { id: "pitch", x: 0, y: 0, width: 20, height: 12 },
  { id: "name", x: 20, y: 0, width: 60, height: 12, alwaysHidden: true },
  { id: "cost", x: 80, y: 0, width: 20, height: 12 },
  /**
   * Full canvas between the header (0–12%) and the type strip (from 86%):
   * side margins, central illustration, and the middle band that was previously uncovered.
   */
  { id: "art", x: 0, y: 12, width: 100, height: 74 },
  /**
   * Type line (class / talent). Center band between widened attack/defense (**22.4%** wide each);
   * width/height scaled vs the prior 57.6×6.72 strip.
   */
  {
    id: "type",
    x: 23,
    y: 86,
    width: 54,
    height: 6.3,
    alwaysHidden: true,
  },
  /** Bottom corners; **+2pp width** vs 20.4 (now 22.4). Visibility from `deterministicStep`. */
  { id: "attack", x: 0, y: 86, width: 22.4, height: 14.28 },
  { id: "defense", x: 77.6, y: 86, width: 22.4, height: 14.28 },
  /**
   * Below the type line; same horizontal band as **type** (aligned width/x).
   */
  {
    id: "cardInfo",
    x: 23,
    y: 93,
    width: 54,
    height: 6.3,
    alwaysHidden: true,
  },
];

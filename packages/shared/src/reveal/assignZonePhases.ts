/**
 * Assigns EARLY / MID / LATE to candidate zones (after `getCandidateZones`).
 * Pure, deterministic, no RNG. Does not mutate inputs.
 */

import type { CardTemplateKey, ZoneId } from "../config/cardTemplates";
import type {
  CandidateZoneEntry,
  CardForCandidateZones,
  CardZoneValidityKind,
} from "./getCandidateZones";

export type RevealPhase = "early" | "mid" | "late";

export type PhaseDebugMeta = {
  /** Short rule id for tests and /dev/zones. */
  rule: string;
  templateKey: CardTemplateKey;
};

export type ZonedCandidateEntry = CandidateZoneEntry & {
  phase: RevealPhase;
  phaseDebug?: PhaseDebugMeta;
};

/** Spreadsheet-style B2: column B (index 1), row 2 (index 1) — focal art cell for 3×3 and 3×5 templates. */
export function isB2Cell(row: number, col: number): boolean {
  return row === 1 && col === 1;
}

/**
 * Declarative hero `visualGrid` phases: **5 rows × 3 cols**, row-major.
 * Index `[row][col]` matches `CandidateZoneEntry.metadata` from the template grid (0-based).
 * **B2** is `(row 1, col 1)` and must stay `"late"`.
 */
export const HERO_PHASE_MAP_3x5 = [
  ["early", "mid", "early"],
  ["mid", "late", "mid"],
  ["mid", "mid", "mid"],
  ["mid", "mid", "mid"],
  ["late", "late", "late"],
] as const satisfies readonly (readonly RevealPhase[])[];

/** Slice index 0–3: first two strips are MID phase; delays top-of-rules text from the EARLY block. */
const TEXT_SLICE_PHASE: RevealPhase[] = ["mid", "mid", "early", "late"];

const STAT_PHASE: Record<
  CardZoneValidityKind,
  Partial<Record<"cost" | "pitch" | "attack" | "defense" | "intellect" | "life", RevealPhase>>
> = {
  attackAction: { cost: "early", pitch: "mid", attack: "late" },
  nonAttackAction: { cost: "early", pitch: "mid" },
  instant: { cost: "early", pitch: "mid" },
  attackReaction: { cost: "early", pitch: "mid", attack: "late" },
  defenseReaction: { cost: "early", pitch: "mid" },
  weapon: { attack: "late" },
  token: { attack: "late" },
  equipment: { defense: "mid" },
  hero: { intellect: "mid", life: "late" },
};

function artPhaseNormal(row: number, col: number, rows: number, cols: number): RevealPhase {
  if (isB2Cell(row, col)) return "late";
  const lastR = rows - 1;
  const lastC = cols - 1;
  const corner =
    (row === 0 || row === lastR) && (col === 0 || col === lastC);
  if (corner) return "early";
  const onEdge = row === 0 || row === lastR || col === 0 || col === lastC;
  if (onEdge) return "mid";
  return "mid";
}

function artPhaseHero(row: number, col: number): RevealPhase {
  const line = HERO_PHASE_MAP_3x5[row];
  return line?.[col] ?? "mid";
}

function inferGridDimensions(artCells: CandidateZoneEntry[]): { rows: number; cols: number } {
  let maxR = 0;
  let maxC = 0;
  for (const z of artCells) {
    const r = z.metadata?.row ?? 0;
    const c = z.metadata?.col ?? 0;
    if (r > maxR) maxR = r;
    if (c > maxC) maxC = c;
  }
  return { rows: maxR + 1, cols: maxC + 1 };
}

function phaseForArtCell(
  card: CardForCandidateZones,
  z: CandidateZoneEntry,
  allArt: CandidateZoneEntry[],
): { phase: RevealPhase; rule: string } {
  const row = z.metadata?.row;
  const col = z.metadata?.col;
  if (row == null || col == null) {
    return { phase: "mid", rule: "art-fallback-missing-rc" };
  }
  if (card.kind === "hero") {
    const p = artPhaseHero(row, col);
    return {
      phase: p,
      rule: `hero-art-map-r${row}c${col}`,
    };
  }
  const { rows, cols } = inferGridDimensions(allArt);
  const p = artPhaseNormal(row, col, rows, cols);
  const lastR = rows - 1;
  const lastC = cols - 1;
  const corner = (row === 0 || row === lastR) && (col === 0 || col === lastC);
  return {
    phase: p,
    rule: isB2Cell(row, col)
      ? "normal-art-b2-late"
      : corner
        ? "normal-art-corner-early"
        : "normal-art-edge-or-interior-mid",
  };
}

function phaseForTextSlice(sliceIndex: number): { phase: RevealPhase; rule: string } {
  const phase = TEXT_SLICE_PHASE[sliceIndex] ?? "mid";
  return { phase, rule: `text-slice-${sliceIndex}-${phase}` };
}

function phaseForType(card: CardForCandidateZones): { phase: RevealPhase; rule: string } {
  if (card.kind === "hero") return { phase: "late", rule: "hero-type-late" };
  return { phase: "mid", rule: "normal-type-mid" };
}

function phaseForStat(
  card: CardForCandidateZones,
  statId: ZoneId,
): { phase: RevealPhase; rule: string } {
  const row = STAT_PHASE[card.kind];
  const p =
    statId === "cost"
      ? row.cost
      : statId === "pitch"
        ? row.pitch
        : statId === "attack"
          ? row.attack
          : statId === "defense"
            ? row.defense
            : statId === "intellect"
              ? row.intellect
              : statId === "life"
                ? row.life
                : undefined;
  if (p) return { phase: p, rule: `stat-${card.kind}-${statId}` };
  return { phase: "mid", rule: `stat-fallback-${statId}` };
}

/**
 * Enriches `candidateZones` with `phase` (and optional `phaseDebug`).
 * `templateKey` is echoed in `phaseDebug` for inspection; phase rules follow `card.kind`.
 */
export function assignZonePhases(
  card: CardForCandidateZones,
  templateKey: CardTemplateKey,
  candidateZones: readonly CandidateZoneEntry[],
): ZonedCandidateEntry[] {
  const artCells = candidateZones.filter((z) => z.type === "art-cell");

  return candidateZones.map((z) => {
    let result: { phase: RevealPhase; rule: string };

    switch (z.type) {
      case "art-cell":
        result = phaseForArtCell(card, z, artCells);
        break;
      case "text-slice":
        result = phaseForTextSlice(z.metadata?.sliceIndex ?? 0);
        break;
      case "type":
        result = phaseForType(card);
        break;
      case "stat": {
        const sid = (z.metadata?.templateZoneId ?? z.id) as ZoneId;
        result = phaseForStat(card, sid);
        break;
      }
    }

    return {
      ...z,
      phase: result.phase,
      phaseDebug: { rule: result.rule, templateKey },
    };
  });
}

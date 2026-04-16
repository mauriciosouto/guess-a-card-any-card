/**
 * Deterministic reveal ordering: one step per zone, EARLY → MID → LATE,
 * semi-random within phase (seeded), B2 forced into final2–3 steps.
 */

import type { CardTemplateKey, Rect } from "../config/cardTemplates";
import {
  getCandidateZones,
  type CandidateZoneCategory,
  type CandidateZoneMetadata,
  type CardForCandidateZones,
} from "./getCandidateZones";
import {
  assignZonePhases,
  type PhaseDebugMeta,
  type RevealPhase,
  type ZonedCandidateEntry,
} from "./assignZonePhases";
import { createSeededRandom } from "./seededRandom";

export type RevealPlanEntry = {
  /** 1-based step index. */
  step: number;
  id: string;
  phase: RevealPhase;
  type: CandidateZoneCategory;
  rect: Rect;
  metadata?: CandidateZoneMetadata;
  phaseDebug?: PhaseDebugMeta;
  /** True when this zone is art cell B2 (row 1, col 1). */
  isB2: boolean;
};

export function isB2RevealZone(z: ZonedCandidateEntry): boolean {
  return z.type === "art-cell" && z.metadata?.row === 1 && z.metadata?.col === 1;
}

function deterministicShuffle<T>(items: readonly T[], seed: string, label: string): T[] {
  const arr = [...items];
  const rand = createSeededRandom(`${seed}:reveal-plan:${label}`);
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    const t = arr[i]!;
    arr[i] = arr[j]!;
    arr[j] = t;
  }
  return arr;
}

/** Global indices where B2 may sit: last up to 3 steps, intersected with late-phase band. */
function b2AllowedIndices(n: number, lateStart: number): number[] {
  if (n === 0) return [];
  const k = Math.min(3, n);
  const out: number[] = [];
  for (let i = n - k; i < n; i++) {
    if (i >= lateStart) out.push(i);
  }
  return out;
}

function placeB2InFinalWindow(plan: ZonedCandidateEntry[], seed: string, lateStart: number): void {
  const n = plan.length;
  const b2Idx = plan.findIndex(isB2RevealZone);
  if (b2Idx < 0) return;

  const allowed = b2AllowedIndices(n, lateStart);
  if (allowed.length === 0) return;

  const rand = createSeededRandom(`${seed}:reveal-plan:b2-slot`);
  const target = allowed[Math.floor(rand() * allowed.length)]!;

  if (b2Idx === target) return;

  const t = plan[b2Idx]!;
  plan[b2Idx] = plan[target]!;
  plan[target] = t;
}

function toEntries(plan: ZonedCandidateEntry[]): RevealPlanEntry[] {
  return plan.map((z, i) => ({
    step: i + 1,
    id: z.id,
    phase: z.phase,
    type: z.type,
    rect: z.rect,
    metadata: z.metadata,
    phaseDebug: z.phaseDebug,
    isB2: isB2RevealZone(z),
  }));
}

/**
 * Ordered reveal plan: shuffle within each phase, concatenate EARLY → MID → LATE,
 * then move B2 into one of the last 2–3 global steps (still within the late block).
 */
export function buildRevealPlan(
  card: CardForCandidateZones,
  templateKey: CardTemplateKey,
  seed: string,
): RevealPlanEntry[] {
  const candidates = getCandidateZones(card, templateKey);
  const zoned = assignZonePhases(card, templateKey, candidates);

  const early = zoned.filter((z) => z.phase === "early");
  const mid = zoned.filter((z) => z.phase === "mid");
  const late = zoned.filter((z) => z.phase === "late");

  const earlyS = deterministicShuffle(early, seed, "phase-early");
  const midS = deterministicShuffle(mid, seed, "phase-mid");
  const lateS = deterministicShuffle(late, seed, "phase-late");

  const plan = [...earlyS, ...midS, ...lateS];
  const lateStart = earlyS.length + midS.length;

  placeB2InFinalWindow(plan, seed, lateStart);

  return toEntries(plan);
}

/**
 * Maps `RevealStateAtStep` to percent-space overlays (blackout = hidden).
 * Compatible with `Region` + `StepCardPreview`-style rendering (hidden only).
 */

import type { CardTemplateKey } from "../config/cardTemplates";
import { fractionRectToPercent, getTemplate } from "./cardTemplateGeometry";
import type { RevealPlanEntry } from "./buildRevealPlan";
import { getInvalidStatBlackoutRegions, type CandidateZoneCategory } from "./getCandidateZones";
import type { RevealStateAtStep } from "./getRevealStateAtStep";
import type { Region } from "./regionTypes";
import type { RevealPhase } from "./assignZonePhases";

export type RevealVisibleSlice = {
  id: string;
  /** 1-based position in the reveal plan. */
  planStep: number;
  phase: RevealPhase;
  type: CandidateZoneCategory;
  isB2: boolean;
  /** Percent of card frame (same space as `Region`). */
  x: number;
  y: number;
  width: number;
  height: number;
};

export type RevealRenderRegions = {
  /** Revealed zones (no mask — informational / hit-test / debug). */
  visible: RevealVisibleSlice[];
  /** Blackout `Region`s for unrevealed plan entries (`effects: blackout`). */
  hidden: Region[];
  /**
   * Name / footer (and any future `alwaysHidden` template rects) — blackout on every step.
   * Geometry from `cardTemplates.ts` only.
   */
  alwaysHidden: Region[];
  /**
   * Stat slots on the template that do not apply to this card kind — masked for whole play
   * (e.g. `defense` on an attack action while the template still defines that rect).
   */
  invalidForKind: Region[];
  meta: {
    effectiveStep: number;
    totalSteps: number;
    templateKey: CardTemplateKey;
    seed: string;
  };
};

/** Template zones marked `alwaysHidden` with a `rect`, as blackout regions (percent space). */
export function getAlwaysHiddenBlackoutRegions(templateKey: CardTemplateKey): Region[] {
  const template = getTemplate(templateKey);
  const out: Region[] = [];
  for (const z of template.zones) {
    if (z.alwaysHidden && z.rect) {
      const g = fractionRectToPercent(z.rect);
      out.push({
        id: `mask-always-${z.id}`,
        x: g.x,
        y: g.y,
        width: g.width,
        height: g.height,
        effects: [{ type: "blackout" }],
      });
    }
  }
  return out;
}

function toVisibleSlice(entry: RevealPlanEntry): RevealVisibleSlice {
  const g = fractionRectToPercent(entry.rect);
  return {
    id: entry.id,
    planStep: entry.step,
    phase: entry.phase,
    type: entry.type,
    isB2: entry.isB2,
    x: g.x,
    y: g.y,
    width: g.width,
    height: g.height,
  };
}

function toBlackoutRegion(entry: RevealPlanEntry): Region {
  const g = fractionRectToPercent(entry.rect);
  return {
    id: `mask-${entry.id}`,
    x: g.x,
    y: g.y,
    width: g.width,
    height: g.height,
    effects: [{ type: "blackout" }],
  };
}

/**
 * Pure adapter: revealed → `visible` slices; unrevealed → `hidden` blackout regions (percent coords).
 */
export function getRenderRegionsFromRevealState(revealState: RevealStateAtStep): RevealRenderRegions {
  const alwaysHidden = getAlwaysHiddenBlackoutRegions(revealState.templateKey);
  const invalidForKind = getInvalidStatBlackoutRegions(revealState.card, revealState.templateKey);
  return {
    visible: revealState.revealed.map(toVisibleSlice),
    hidden: revealState.unrevealed.map(toBlackoutRegion),
    alwaysHidden,
    invalidForKind,
    meta: {
      effectiveStep: revealState.effectiveStep,
      totalSteps: revealState.totalSteps,
      templateKey: revealState.templateKey,
      seed: revealState.seed,
    },
  };
}

export type BlackoutFromRevealOptions = {
  /**
   * When `false`, omit name/footer (`alwaysHidden`) blackouts — full card art on end screens.
   * Default `true` (masks stay during play).
   */
  includeAlwaysHidden?: boolean;
  /**
   * When `false`, omit inactive stat-slot masks (`invalidForKind`) — use with `includeAlwaysHidden: false` on terminal.
   */
  includeInvalidForKindMasks?: boolean;
};

/** All blackout overlays: plan + optional always-hidden + optional inactive stat rects. */
export function getBlackoutRegionsFromRevealState(
  revealState: RevealStateAtStep,
  options?: BlackoutFromRevealOptions,
): Region[] {
  const r = getRenderRegionsFromRevealState(revealState);
  const includeAlways = options?.includeAlwaysHidden !== false;
  const includeInvalid = options?.includeInvalidForKindMasks !== false;
  return [
    ...r.hidden,
    ...(includeAlways ? r.alwaysHidden : []),
    ...(includeInvalid ? r.invalidForKind : []),
  ];
}

/**
 * Step-indexed reveal state from `buildRevealPlan` (no UI / gameplay wiring).
 */

import type { CardTemplateKey } from "../config/cardTemplates";
import { buildRevealPlan, type RevealPlanEntry } from "./buildRevealPlan";
import type { CardForCandidateZones } from "./getCandidateZones";

export type RevealStateDebugMeta = {
  /** Raw `currentStep` passed in (may be non-integer or non-finite). */
  requestedStep: number;
  /** True when the request was adjusted to compute `effectiveStep`. */
  clamped: boolean;
};

export type RevealStateAtStep = {
  card: CardForCandidateZones;
  templateKey: CardTemplateKey;
  seed: string;
  requestedStep: number;
  /** 1-based step after clamping; `0` when `totalSteps === 0`. */
  effectiveStep: number;
  totalSteps: number;
  /** Full ordered plan (`buildRevealPlan` for this input). */
  plan: readonly RevealPlanEntry[];
  /** Entries with `step <= effectiveStep` (first `effectiveStep` slots). */
  revealed: readonly RevealPlanEntry[];
  /** Entries still masked after `effectiveStep`. */
  unrevealed: readonly RevealPlanEntry[];
  debug: RevealStateDebugMeta;
};

function computeEffectiveStep(currentStep: number, totalSteps: number): number {
  if (totalSteps <= 0) return 0;
  const raw = Number.isFinite(currentStep) ? Math.floor(currentStep) : NaN;
  const lower = Number.isFinite(raw) ? raw : 1;
  return Math.min(Math.max(1, lower), totalSteps);
}

function wasClamped(requestedStep: number, effectiveStep: number, totalSteps: number): boolean {
  if (!Number.isFinite(requestedStep)) return true;
  if (totalSteps <= 0) return requestedStep !== 0 && requestedStep !== effectiveStep;
  const raw = Math.floor(requestedStep);
  return raw !== effectiveStep;
}

/**
 * Progressive reveal: at1-based step `k`, the first `k` plan entries are revealed.
 * `currentStep` is clamped to `[1, totalSteps]` when `totalSteps > 0`; use `0` when empty plan.
 */
export function getRevealStateAtStep(
  card: CardForCandidateZones,
  templateKey: CardTemplateKey,
  seed: string,
  currentStep: number,
): RevealStateAtStep {
  const plan = buildRevealPlan(card, templateKey, seed);
  const totalSteps = plan.length;
  const effectiveStep = computeEffectiveStep(currentStep, totalSteps);

  const revealed = plan.slice(0, effectiveStep);
  const unrevealed = plan.slice(effectiveStep);

  return {
    card,
    templateKey,
    seed,
    requestedStep: currentStep,
    effectiveStep,
    totalSteps,
    plan,
    revealed,
    unrevealed,
    debug: {
      requestedStep: currentStep,
      clamped: wasClamped(currentStep, effectiveStep, totalSteps),
    },
  };
}

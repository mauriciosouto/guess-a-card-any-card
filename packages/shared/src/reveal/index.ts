export * from "../config/cardTemplates";
export * from "./seededRandom";
export * from "./effects/types";
export * from "./regionTypes";
export * from "./cardTemplateGeometry";
export * from "./getCandidateZones";
export * from "./assignZonePhases";
export * from "./buildRevealPlan";
export * from "./getRevealStateAtStep";
export * from "./getRenderRegionsFromRevealState";

import type { CardTemplateKey } from "../config/cardTemplates";
import { buildRevealPlan } from "./buildRevealPlan";
import type { CardForCandidateZones } from "./getCandidateZones";

export function getRevealPlanTotalSteps(
  card: CardForCandidateZones,
  templateKey: CardTemplateKey,
  seed: string,
): number {
  return buildRevealPlan(card, templateKey, seed).length;
}

/** Until puzzles store FAB classification, all games use this reveal profile for step counts + client rendering. */
export const DEFAULT_REVEAL_CARD: CardForCandidateZones = { kind: "attackAction" };
export const DEFAULT_REVEAL_TEMPLATE_KEY: CardTemplateKey = "actionLike";

import {
  DEFAULT_REVEAL_CARD,
  DEFAULT_REVEAL_TEMPLATE_KEY,
  getRevealPlanTotalSteps,
  type CardTemplateKey,
  type CardZoneValidityKind,
} from "@gac/shared/reveal";

export type RevealProfileDefaults = {
  cardKind: CardZoneValidityKind;
  templateKey: CardTemplateKey;
};

/** Default FAB reveal classification when deriving a profile from partial catalog data (must match client). */
export function defaultRevealProfileDefaults(): RevealProfileDefaults {
  return {
    cardKind: DEFAULT_REVEAL_CARD.kind,
    templateKey: DEFAULT_REVEAL_TEMPLATE_KEY,
  };
}

export function gameRevealTotalSteps(args: {
  seed: string;
  revealCardKind: CardZoneValidityKind;
  cardTemplateKey: CardTemplateKey;
}): number {
  return getRevealPlanTotalSteps(
    { kind: args.revealCardKind },
    args.cardTemplateKey,
    args.seed,
  );
}

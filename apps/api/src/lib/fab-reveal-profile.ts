import type { Card } from "@flesh-and-blood/types";
import { Subtype, Type } from "@flesh-and-blood/types";
import type { CardTemplateKey, CardZoneValidityKind } from "@gac/shared/reveal";

import { defaultRevealProfileDefaults } from "@/lib/reveal-profile";

export type FabRevealProfile = {
  revealCardKind: CardZoneValidityKind;
  cardTemplateKey: CardTemplateKey;
};

/**
 * Map official FAB `Card` typing to reveal engine profile (see `docs/ZONE_VALIDITY.md`).
 */
export function revealProfileFromFabCard(card: Card): FabRevealProfile {
  const types = card.types ?? [];

  if (types.includes(Type.Hero) || types.includes(Type.DemiHero)) {
    return { revealCardKind: "hero", cardTemplateKey: "hero" };
  }
  if (types.includes(Type.Weapon)) {
    return { revealCardKind: "weapon", cardTemplateKey: "weaponEquipment" };
  }
  if (types.includes(Type.Equipment)) {
    return { revealCardKind: "equipment", cardTemplateKey: "weaponEquipment" };
  }
  if (types.includes(Type.Token)) {
    return { revealCardKind: "token", cardTemplateKey: "weaponEquipment" };
  }
  if (types.includes(Type.AttackReaction)) {
    return { revealCardKind: "attackReaction", cardTemplateKey: "actionLike" };
  }
  if (types.includes(Type.DefenseReaction)) {
    return { revealCardKind: "defenseReaction", cardTemplateKey: "actionLike" };
  }
  if (types.includes(Type.Instant)) {
    return { revealCardKind: "instant", cardTemplateKey: "actionLike" };
  }
  if (types.includes(Type.Block)) {
    return { revealCardKind: "defenseReaction", cardTemplateKey: "actionLike" };
  }
  if (types.includes(Type.Action)) {
    const isAttack = card.subtypes?.includes(Subtype.Attack) ?? false;
    return {
      revealCardKind: isAttack ? "attackAction" : "nonAttackAction",
      cardTemplateKey: "actionLike",
    };
  }

  const fallback = defaultRevealProfileDefaults();
  return {
    revealCardKind: fallback.cardKind,
    cardTemplateKey: fallback.templateKey,
  };
}

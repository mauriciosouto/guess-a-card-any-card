/**
 * Card zone geometry for the reveal engine. Loaded from `reveal-engine-zones.json` so challenge,
 * single-player, coop, and competitive all share one source of truth with docs/CARD_TEMPLATES.md.
 */
import revealEngineZones from "./reveal-engine-zones.json";

export type Rect = {
  x: number;
  y: number;
  width: number;
  height: number;
};

export type GridRect = Rect & {
  rows: number;
  cols: number;
};

export type ZoneId =
  | "name"
  | "footer"
  | "type"
  | "pitch"
  | "cost"
  | "attack"
  | "defense"
  | "intellect"
  | "life"
  | "artGrid"
  | "visualGrid"
  | "textBlock";

export type ZoneConfig = {
  id: ZoneId;
  rect?: Rect;
  grid?: GridRect;
  slices?: number;
  alwaysHidden?: boolean;
};

export type CardTemplateKey =
  | "actionLike"
  | "hero"
  | "weaponEquipment";

export type CardTemplate = {
  key: CardTemplateKey;
  zones: ZoneConfig[];
};

export const cardTemplates: Record<CardTemplateKey, CardTemplate> = {
  actionLike: revealEngineZones.templates.actionLike as CardTemplate,
  hero: revealEngineZones.templates.hero as CardTemplate,
  weaponEquipment: revealEngineZones.templates.weaponEquipment as CardTemplate,
};

export const actionLikeTemplate = cardTemplates.actionLike;
export const heroTemplate = cardTemplates.hero;
export const weaponEquipmentTemplate = cardTemplates.weaponEquipment;

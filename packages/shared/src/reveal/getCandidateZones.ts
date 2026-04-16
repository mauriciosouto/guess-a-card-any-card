/**
 * Valid gameplay candidates from `cardTemplates` + `docs/ZONE_VALIDITY.md`.
 * Pure: no UI, no game state, no RNG. Does not mutate templates.
 */

import type { CardTemplate, CardTemplateKey, GridRect, Rect, ZoneId } from "../config/cardTemplates";
import {
  expandGridCellRects,
  expandTextBlockRects,
  findZone,
  fractionRectToPercent,
  getTemplate,
} from "./cardTemplateGeometry";
import type { Region } from "./regionTypes";

/** Rows in `/docs/ZONE_VALIDITY.md` Card Type Matrix. */
export type CardZoneValidityKind =
  | "attackAction"
  | "nonAttackAction"
  | "instant"
  | "attackReaction"
  | "defenseReaction"
  | "weapon"
  | "token"
  | "equipment"
  | "hero";

export type CardForCandidateZones = {
  kind: CardZoneValidityKind;
};

export type CandidateZoneCategory = "art-cell" | "text-slice" | "stat" | "type";

export type CandidateZoneMetadata = {
  row?: number;
  col?: number;
  sliceIndex?: number;
  /** Template container (`artGrid` / `visualGrid` / `textBlock` / stat / `type`). */
  templateZoneId?: ZoneId;
};

export type CandidateZoneEntry = {
  id: string;
  type: CandidateZoneCategory;
  rect: Rect;
  metadata?: CandidateZoneMetadata;
};

type Validity = {
  art: boolean;
  text: boolean;
  type: boolean;
  cost: boolean;
  pitch: boolean;
  attack: boolean;
  defense: boolean;
  intellect: boolean;
  life: boolean;
};

const VALIDITY_BY_KIND: Record<CardZoneValidityKind, Validity> = {
  attackAction: {
    art: true,
    text: true,
    type: true,
    cost: true,
    pitch: true,
    attack: true,
    defense: false,
    intellect: false,
    life: false,
  },
  nonAttackAction: {
    art: true,
    text: true,
    type: true,
    cost: true,
    pitch: true,
    attack: false,
    defense: false,
    intellect: false,
    life: false,
  },
  instant: {
    art: true,
    text: true,
    type: true,
    cost: true,
    pitch: true,
    attack: false,
    defense: false,
    intellect: false,
    life: false,
  },
  attackReaction: {
    art: true,
    text: true,
    type: true,
    cost: true,
    pitch: true,
    attack: true,
    defense: false,
    intellect: false,
    life: false,
  },
  defenseReaction: {
    art: true,
    text: true,
    type: true,
    cost: true,
    pitch: true,
    attack: false,
    defense: false,
    intellect: false,
    life: false,
  },
  weapon: {
    art: true,
    text: true,
    type: true,
    cost: false,
    pitch: false,
    attack: true,
    defense: false,
    intellect: false,
    life: false,
  },
  /** Same zone validity as `weapon`; use `weaponEquipment` template. */
  token: {
    art: true,
    text: true,
    type: true,
    cost: false,
    pitch: false,
    attack: true,
    defense: false,
    intellect: false,
    life: false,
  },
  equipment: {
    art: true,
    text: true,
    type: true,
    cost: false,
    pitch: false,
    attack: false,
    defense: true,
    intellect: false,
    life: false,
  },
  hero: {
    art: true,
    text: false,
    type: true,
    cost: false,
    pitch: false,
    attack: false,
    defense: false,
    intellect: true,
    life: true,
  },
};

const STAT_IDS: ZoneId[] = ["cost", "pitch", "attack", "defense", "intellect", "life"];

function statAllowed(v: Validity, id: ZoneId): boolean {
  if (id === "cost") return v.cost;
  if (id === "pitch") return v.pitch;
  if (id === "attack") return v.attack;
  if (id === "defense") return v.defense;
  if (id === "intellect") return v.intellect;
  if (id === "life") return v.life;
  return false;
}

function artContainer(template: CardTemplate): {
  templateZoneId: "artGrid" | "visualGrid";
  grid: GridRect;
} | null {
  const art = findZone(template, "artGrid");
  if (art?.grid) return { templateZoneId: "artGrid", grid: art.grid };
  const vis = findZone(template, "visualGrid");
  if (vis?.grid) return { templateZoneId: "visualGrid", grid: vis.grid };
  return null;
}

/**
 * Flat, validity-filtered candidate zones for reveal planning.
 * Geometry is 0–1 card space from the template only.
 */
export function getCandidateZones(
  card: CardForCandidateZones,
  templateKey: CardTemplateKey,
): CandidateZoneEntry[] {
  const v = VALIDITY_BY_KIND[card.kind];
  const template = getTemplate(templateKey);
  const out: CandidateZoneEntry[] = [];

  if (v.art) {
    const container = artContainer(template);
    if (container) {
      for (const c of expandGridCellRects(container.grid)) {
        out.push({
          id: `${container.templateZoneId}:cell:${c.index}`,
          type: "art-cell",
          rect: c.rect,
          metadata: {
            row: c.row,
            col: c.col,
            templateZoneId: container.templateZoneId,
          },
        });
      }
    }
  }

  if (v.text) {
    for (const s of expandTextBlockRects(template)) {
      out.push({
        id: `textBlock:slice:${s.index}`,
        type: "text-slice",
        rect: s.rect,
        metadata: { sliceIndex: s.index, templateZoneId: "textBlock" },
      });
    }
  }

  if (v.type) {
    const z = findZone(template, "type");
    if (z?.rect) {
      out.push({
        id: "type",
        type: "type",
        rect: z.rect,
        metadata: { templateZoneId: "type" },
      });
    }
  }

  for (const sid of STAT_IDS) {
    if (!statAllowed(v, sid)) continue;
    const z = findZone(template, sid);
    if (!z?.rect) continue;
    out.push({
      id: sid,
      type: "stat",
      rect: z.rect,
      metadata: { templateZoneId: sid },
    });
  }

  return out;
}

/**
 * Template stat rects that are **not** reveal candidates for this card kind (see `VALIDITY_BY_KIND`).
 * They must stay blacked out during play so pixels there are not visible before their slot would be
 * revealed — e.g. defense row on an attack action (`actionLike` template still has a defense rect).
 */
export function getInvalidStatBlackoutRegions(
  card: CardForCandidateZones,
  templateKey: CardTemplateKey,
): Region[] {
  const v = VALIDITY_BY_KIND[card.kind];
  const template = getTemplate(templateKey);
  const out: Region[] = [];
  for (const sid of STAT_IDS) {
    if (statAllowed(v, sid)) continue;
    const z = findZone(template, sid);
    if (!z?.rect) continue;
    const g = fractionRectToPercent(z.rect);
    out.push({
      id: `mask-inactive-${sid}`,
      x: g.x,
      y: g.y,
      width: g.width,
      height: g.height,
      effects: [{ type: "blackout" }],
    });
  }
  return out;
}

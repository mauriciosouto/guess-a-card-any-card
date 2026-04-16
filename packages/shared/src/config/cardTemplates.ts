export type Rect = {
  x: number
  y: number
  width: number
  height: number
}

export type GridRect = Rect & {
  rows: number
  cols: number
}

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
  | "textBlock"

export type ZoneConfig = {
  id: ZoneId
  rect?: Rect
  grid?: GridRect
  slices?: number
  alwaysHidden?: boolean
}

export type CardTemplateKey =
  | "actionLike"
  | "hero"
  | "weaponEquipment"

export type CardTemplate = {
  key: CardTemplateKey
  zones: ZoneConfig[]
}

export const actionLikeTemplate: CardTemplate = {
  key: "actionLike",
  zones: [
    {
      id: "pitch",
      rect: {
        x: 0.05,
        y: 0.04,
        width: 0.14,
        height: 0.08,
      },
    },
    {
      id: "name",
      rect: {
        x: 0.19,
        y: 0.04,
        width: 0.63,
        height: 0.08,
      },
      alwaysHidden: true,
    },
    {
      id: "cost",
      rect: {
        x: 0.81,
        y: 0.04,
        width: 0.14,
        height: 0.08,
      },
    },
    {
      id: "artGrid",
      grid: {
        x: 0.05,
        y: 0.12,
        width: 0.9,
        height: 0.48,
        rows: 3,
        cols: 3,
      },
    },
    {
      id: "textBlock",
      rect: {
        x: 0.05,
        y: 0.62,
        width: 0.9,
        height: 0.23,
      },
      slices: 4,
    },
    {
      id: "attack",
      rect: {
        x: 0.05,
        y: 0.86,
        width: 0.2,
        height: 0.08,
      },
    },
    {
      id: "type",
      rect: {
        x: 0.25,
        y: 0.86,
        width: 0.5,
        height: 0.08,
      },
    },
    {
      id: "defense",
      rect: {
        x: 0.75,
        y: 0.86,
        width: 0.2,
        height: 0.08,
      },
    },
    {
      id: "footer",
      rect: {
        x: 0.05,
        y: 0.94,
        width: 0.9,
        height: 0.04,
      },
      alwaysHidden: true,
    },
  ],
}

export const heroTemplate: CardTemplate = {
  key: "hero",
  zones: [
    {
      id: "name",
      rect: {
        x: 0.08,
        y: 0.04,
        width: 0.72,
        height: 0.08,
      },
      alwaysHidden: true,
    },
    {
      id: "visualGrid",
      grid: {
        x: 0.05,
        y: 0.12,
        width: 0.9,
        height: 0.68,
        rows: 5,
        cols: 3,
      },
    },
    {
      id: "intellect",
      rect: {
        x: 0.05,
        y: 0.8,
        width: 0.2,
        height: 0.08,
      },
    },
    {
      id: "type",
      rect: {
        x: 0.25,
        y: 0.8,
        width: 0.5,
        height: 0.06,
      },
    },
    {
      id: "life",
      rect: {
        x: 0.75,
        y: 0.8,
        width: 0.2,
        height: 0.08,
      },
    },
    {
      id: "footer",
      rect: {
        x: 0.25,
        y: 0.88,
        width: 0.5,
        height: 0.05,
      },
      alwaysHidden: true,
    },
  ],
}

export const weaponEquipmentTemplate: CardTemplate = {
  key: "weaponEquipment",
  zones: [
    {
      id: "name",
      rect: {
        x: 0.08,
        y: 0.04,
        width: 0.84,
        height: 0.08,
      },
      alwaysHidden: true,
    },
    {
      id: "artGrid",
      grid: {
        x: 0.05,
        y: 0.12,
        width: 0.9,
        height: 0.48,
        rows: 3,
        cols: 3,
      },
    },
    {
      id: "textBlock",
      rect: {
        x: 0.05,
        y: 0.62,
        width: 0.9,
        height: 0.2,
      },
      slices: 4,
    },
    {
      id: "attack",
      rect: {
        x: 0.05,
        y: 0.82,
        width: 0.2,
        height: 0.08,
      },
    },
    {
      id: "type",
      rect: {
        x: 0.35,
        y: 0.82,
        width: 0.3,
        height: 0.06,
      },
    },
    {
      id: "defense",
      rect: {
        x: 0.75,
        y: 0.82,
        width: 0.2,
        height: 0.08,
      },
    },
    {
      id: "footer",
      rect: {
        x: 0.25,
        y: 0.9,
        width: 0.5,
        height: 0.05,
      },
      alwaysHidden: true,
    },
  ],
}

export const cardTemplates: Record<CardTemplateKey, CardTemplate> = {
  actionLike: actionLikeTemplate,
  hero: heroTemplate,
  weaponEquipment: weaponEquipmentTemplate,
}
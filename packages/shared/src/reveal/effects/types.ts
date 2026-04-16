export type EffectType =
  | "blur"
  | "pixelate"
  | "blackout"
  | "rotate"
  | "invert"
  | "brightness";

export type Effect = {
  type: EffectType;
  intensity?: number;
};

export type StepEffectKind = Exclude<EffectType, "rotate">;

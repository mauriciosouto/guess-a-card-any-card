"use client";

import type { CSSProperties } from "react";
import { useMemo } from "react";
import {
  getBlackoutRegionsFromRevealState,
  getRevealStateAtStep,
  type CardTemplateKey,
  type CardZoneValidityKind,
  type Region,
} from "@gac/shared/reveal";
import { cn } from "@/lib/utils/cn";

const BROKEN =
  "data:image/svg+xml," +
  encodeURIComponent(
    '<svg xmlns="http://www.w3.org/2000/svg" width="300" height="420"><rect fill="%231a0a1f" width="100%" height="100%"/><text x="50%" y="50%" fill="%23c9a227" text-anchor="middle" font-family="sans-serif" font-size="14">Card art</text></svg>',
  );

export type StepCardPreviewProps = {
  imageUrl: string;
  seed: string;
  /** 1-based gameplay step (clamped by `getRevealStateAtStep` to the reveal plan). */
  step: number;
  revealCardKind: CardZoneValidityKind;
  alt?: string;
  className?: string;
  /** Outer frame; inner card uses aspect 5/7 like admin. */
  frameClassName?: string;
  /** Hide step label (game HUD may show step elsewhere). */
  showStepLabel?: boolean;
  /** Zone geometry from shared `cardTemplates` (default actionLike). */
  cardTemplateKey?: CardTemplateKey;
  /**
   * End screen: drop name/footer and inactive stat-slot masks so the full card shows.
   * @default false
   */
  terminalFullReveal?: boolean;
};

function BlackoutOverlay({ region }: { region: Region }) {
  const style: CSSProperties = {
    position: "absolute",
    zIndex: region.zIndex ?? 1,
    left: `${region.x}%`,
    top: `${region.y}%`,
    width: `${region.width}%`,
    height: `${region.height}%`,
    pointerEvents: "none",
  };
  return <div style={style} className="bg-[var(--card-zone-mask)]" />;
}

/**
 * Client-side reveal: blackout overlays from `getRevealStateAtStep` + full hero art.
 */
export function StepCardPreview({
  imageUrl,
  seed,
  step,
  revealCardKind,
  alt = "Mystery card",
  className,
  frameClassName,
  showStepLabel = false,
  cardTemplateKey = "actionLike",
  terminalFullReveal = false,
}: StepCardPreviewProps) {
  const blackouts = useMemo(() => {
    const state = getRevealStateAtStep({ kind: revealCardKind }, cardTemplateKey, seed, step);
    return getBlackoutRegionsFromRevealState(state, {
      includeAlwaysHidden: !terminalFullReveal,
      includeInvalidForKindMasks: !terminalFullReveal,
    });
  }, [revealCardKind, cardTemplateKey, seed, step, terminalFullReveal]);

  return (
    <div className={cn("flex w-full flex-col items-center gap-1.5", className)}>
      {showStepLabel ? (
        <p className="font-display text-center text-[0.65rem] font-semibold uppercase tracking-[0.2em] text-[var(--gold-dim)]">
          Step {step}
        </p>
      ) : null}
      <div
        className={cn(
          "relative aspect-[5/7] w-full overflow-hidden rounded-lg border border-[var(--gold-dim)]/40 bg-[var(--void)]",
          frameClassName,
        )}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={imageUrl}
          alt={alt}
          className="absolute inset-0 z-0 h-full w-full object-cover object-top"
          loading="lazy"
          onError={(e) => {
            const t = e.currentTarget;
            if (t.dataset.fallback === "1") return;
            t.dataset.fallback = "1";
            t.src = BROKEN;
          }}
        />
        {blackouts.map((r) => (
          <BlackoutOverlay key={r.id} region={r} />
        ))}
      </div>
    </div>
  );
}

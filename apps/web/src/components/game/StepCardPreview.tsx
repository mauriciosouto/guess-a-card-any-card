"use client";

import type { CSSProperties } from "react";
import { useMemo } from "react";
import type { Effect } from "@/lib/puzzle/effects/types";
import type { Region } from "@/lib/puzzle/regionTypes";
import { generateRegions } from "@/lib/puzzle/generateRegions";
import { cn } from "@/lib/utils/cn";

const BROKEN =
  "data:image/svg+xml," +
  encodeURIComponent(
    '<svg xmlns="http://www.w3.org/2000/svg" width="300" height="420"><rect fill="%231a0a1f" width="100%" height="100%"/><text x="50%" y="50%" fill="%23c9a227" text-anchor="middle" font-family="sans-serif" font-size="14">Card art</text></svg>',
  );

export type StepCardPreviewProps = {
  imageUrl: string;
  seed: string;
  /** Global puzzle step 1..15 (same contract as admin `generateRegions`). */
  step: number;
  alt?: string;
  className?: string;
  /** Outer frame; inner card uses aspect 5/7 like admin. */
  frameClassName?: string;
  /** Hide step label (game HUD may show step elsewhere). */
  showStepLabel?: boolean;
};

function buildFilterString(effects: Effect[]): string | undefined {
  const parts: string[] = [];
  for (const e of effects) {
    if (e.type === "blur") {
      const px = Math.round(((e.intensity ?? 4) + Number.EPSILON) * 100) / 100;
      parts.push(`blur(${px}px)`);
    } else if (e.type === "brightness") {
      const v =
        Math.round(((e.intensity ?? 1) + Number.EPSILON) * 1000) / 1000;
      parts.push(`brightness(${v})`);
    } else if (e.type === "invert") {
      const v =
        Math.round(((e.intensity ?? 1) + Number.EPSILON) * 1000) / 1000;
      parts.push(`invert(${v})`);
    }
  }
  return parts.length ? parts.join(" ") : undefined;
}

function RegionOverlay({
  region,
  imageUrl,
}: {
  region: Region;
  imageUrl: string;
}) {
  const base: CSSProperties = {
    position: "absolute",
    zIndex: region.zIndex ?? 1,
    left: `${region.x}%`,
    top: `${region.y}%`,
    width: `${region.width}%`,
    height: `${region.height}%`,
    pointerEvents: "none",
  };

  if (region.effects.some((e) => e.type === "blackout")) {
    return (
      <div
        style={base}
        className="bg-[var(--card-zone-mask)]"
      />
    );
  }

  const rotateEff = region.effects.find((e) => e.type === "rotate");
  const rotateDeg = rotateEff?.intensity;
  const hasPixelate = region.effects.some((e) => e.type === "pixelate");
  const filter = buildFilterString(region.effects);

  const w = region.width;
  const h = region.height;
  const x = region.x;
  const y = region.y;
  if (w <= 0 || h <= 0) {
    return null;
  }

  const wrapperStyle: CSSProperties = {
    ...base,
    overflow: "hidden",
  };
  if (rotateDeg != null) {
    wrapperStyle.transform = `rotate(${rotateDeg}deg)`;
    wrapperStyle.transformOrigin = "center center";
  }

  const imgStyle: CSSProperties = {
    position: "absolute",
    width: `${(100 / w) * 100}%`,
    height: `${(100 / h) * 100}%`,
    left: `${(-x / w) * 100}%`,
    top: `${(-y / h) * 100}%`,
    objectFit: "cover",
    objectPosition: "top center",
  };
  if (filter) {
    imgStyle.filter = filter;
  }
  if (hasPixelate) {
    imgStyle.imageRendering = "pixelated";
    imgStyle.transform = "scale(1.1)";
  }

  return (
    <div style={wrapperStyle}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={imageUrl}
        alt=""
        className="max-w-none select-none"
        draggable={false}
        style={imgStyle}
      />
    </div>
  );
}

/**
 * Client-side FAB puzzle step — overlays are a pure function of `seed` + `step`
 * (parity with image-guess-admin `puzzle-step-tile.tsx`).
 */
export function StepCardPreview({
  imageUrl,
  seed,
  step,
  alt = "Mystery card",
  className,
  frameClassName,
  showStepLabel = false,
}: StepCardPreviewProps) {
  const regions = useMemo(() => generateRegions(seed, step), [seed, step]);

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
        {regions.map((r) => (
          <RegionOverlay key={r.id} region={r} imageUrl={imageUrl} />
        ))}
      </div>
    </div>
  );
}

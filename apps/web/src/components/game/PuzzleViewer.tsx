"use client";

import { assetPaths } from "@/lib/design-tokens";
import { PUZZLE_STEP_COUNT } from "@/lib/puzzle/deterministicStep";
import { cn } from "@/lib/utils/cn";
import { StepCardPreview } from "@/components/game/StepCardPreview";

export type PuzzleViewerProps = {
  imageUrl?: string | null;
  alt?: string;
  /** Change when the step changes to replay slide animation */
  stepKey?: string | number;
  className?: string;
  /**
   * When set with `imageUrl` and `puzzleStep`, renders admin-parity zone overlays
   * (`generateRegions(seed, puzzleStep)`); ignores DB `PuzzleStep.imageUrl` / blur rows for art.
   */
  puzzleSeed?: string | null;
  /** Global step 1..PUZZLE_STEP_COUNT (default 15). */
  puzzleStep?: number;
};

/**
 * Primary gameplay focal point — fantasy frame, layered panel texture, slide-in per step.
 */
export function PuzzleViewer({
  imageUrl,
  alt = "Mystery card",
  stepKey = 0,
  className,
  puzzleSeed,
  puzzleStep = 1,
}: PuzzleViewerProps) {
  const safeOverlayStep = Math.min(
    Math.max(1, puzzleStep),
    PUZZLE_STEP_COUNT,
  );
  const useDeterministic = Boolean(imageUrl && puzzleSeed);
  return (
    <div
      className={cn(
        "relative mx-auto w-full max-w-md",
        "before:pointer-events-none before:absolute before:-inset-[10px] before:rounded-2xl before:border before:border-[var(--gold)]/20 before:shadow-[0_0_40px_rgba(201,162,39,0.12)]",
        "after:pointer-events-none after:absolute after:-inset-1 after:rounded-[14px] after:ring-1 after:ring-[var(--blood)]/25",
        className,
      )}
    >
      <div
        className="relative flex w-full justify-center overflow-hidden rounded-xl border-2 border-[var(--gold-dim)]/50 bg-[var(--void)] shadow-[inset_0_0_60px_rgba(0,0,0,0.65),0_16px_48px_rgba(0,0,0,0.5)]"
        style={{
          backgroundImage: `
            linear-gradient(180deg, rgba(26, 15, 32, 0.4) 0%, rgba(8, 4, 12, 0.85) 100%),
            url("${assetPaths.panelTexture}")
          `,
          backgroundSize: "cover, cover",
          backgroundPosition: "center, center",
          backgroundBlendMode: "normal, soft-light",
        }}
      >
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-[var(--void)]/50 via-transparent to-[var(--gold)]/05" />
        {/*
          When max-height caps the box, width from aspect-ratio is below 100% of the frame.
          flex justify-center on the outer frame + max-w ties width to the same cap so the slab stays centered.
        */}
        <div
          className={cn(
            "relative z-[1] flex aspect-[3/4] w-full max-w-[min(100%,calc(0.75*min(72vh,520px)))] max-h-[min(72vh,520px)] min-w-0 flex-col items-center justify-center p-3 sm:p-4",
          )}
        >
          {imageUrl ? (
            <div
              key={`${stepKey}-${imageUrl}-${puzzleSeed ?? ""}-${safeOverlayStep}`}
              className="relative z-[1] flex h-full max-h-[min(72vh,520px)] w-full min-w-0 items-center justify-center py-0.5"
            >
              {useDeterministic ? (
                <div className="animate-slide-step flex w-full justify-center">
                  <StepCardPreview
                    imageUrl={imageUrl}
                    seed={puzzleSeed!}
                    step={safeOverlayStep}
                    alt={alt}
                    className="w-[min(100%,280px)] max-w-full shrink-0 sm:w-[min(100%,320px)]"
                  />
                </div>
              ) : (
                /* eslint-disable-next-line @next/next/no-img-element */
                <img
                  src={imageUrl}
                  alt={alt}
                  className="animate-slide-step mx-auto max-h-full max-w-full object-contain object-center drop-shadow-[0_8px_32px_rgba(0,0,0,0.75)]"
                />
              )}
            </div>
          ) : (
            <div className="relative z-[1] flex flex-col items-center justify-center gap-4 px-8 text-center">
              <div
                className="h-24 w-20 rounded-lg border border-[var(--gold)]/30 bg-[var(--void)]/60 shadow-[inset_0_0_24px_rgba(201,162,39,0.08)]"
                aria-hidden
              />
              <p className="font-display text-xs font-medium uppercase tracking-[0.28em] text-[var(--mist)]">
                Awaiting the reveal
              </p>
              <p className="max-w-[12rem] text-xs leading-relaxed text-[var(--parchment-dim)]">
                The sigil forms when your match begins.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

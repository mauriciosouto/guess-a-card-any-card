"use client";

import { assetPaths } from "@/lib/design-tokens";
import { cn } from "@/lib/utils/cn";
import { StepCardPreview } from "@/components/game/StepCardPreview";
import type { CardTemplateKey, CardZoneValidityKind } from "@gac/shared/reveal";

export type PuzzleViewerProps = {
  imageUrl?: string | null;
  alt?: string;
  /** Change when the step changes to replay slide animation */
  stepKey?: string | number;
  className?: string;
  revealSeed?: string | null;
  /** 1-based reveal step index (clamped to `revealTotalSteps`). */
  revealStep?: number;
  /** From server: `revealPlan.length` — caps overlay step. */
  revealTotalSteps?: number;
  revealCardKind?: CardZoneValidityKind;
  cardTemplateKey?: CardTemplateKey;
  /**
   * After win/loss: show full card (drops name/footer + inactive stat-slot blackouts).
   * Still uses `revealStep` / plan for zone masks; use final step + this for a fully unmasked card.
   */
  terminalFullReveal?: boolean;
};

/**
 * Primary gameplay focal point — fantasy frame, layered panel texture, slide-in per step.
 */
export function PuzzleViewer({
  imageUrl,
  alt = "Mystery card",
  stepKey = 0,
  className,
  revealSeed,
  revealStep = 1,
  revealTotalSteps,
  revealCardKind,
  cardTemplateKey,
  terminalFullReveal = false,
}: PuzzleViewerProps) {
  const useReveal =
    Boolean(imageUrl && revealSeed && revealTotalSteps != null && revealTotalSteps >= 1 && revealCardKind);

  const safeOverlayStep =
    useReveal && revealTotalSteps != null
      ? Math.min(Math.max(1, revealStep), revealTotalSteps)
      : Math.max(1, revealStep);

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
        className={cn(
          "relative flex w-full items-center justify-center rounded-xl border-2 border-[var(--gold-dim)]/50 bg-[var(--void)] shadow-[inset_0_0_60px_rgba(0,0,0,0.65),0_16px_48px_rgba(0,0,0,0.5)]",
          terminalFullReveal ? "overflow-visible" : "overflow-hidden",
        )}
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
        <div
          className={cn(
            "relative z-[1] flex aspect-[3/4] w-full max-w-full min-w-0 flex-col items-center justify-center self-center p-3 sm:p-4",
            terminalFullReveal
              ? "max-h-[min(90vh,720px)] max-w-[min(100%,calc(0.75*min(90vh,720px)))]"
              : "max-h-[min(72vh,520px)] max-w-[min(100%,calc(0.75*min(72vh,520px)))]",
          )}
        >
          {imageUrl ? (
            <div
              key={`${stepKey}-${imageUrl}-${revealSeed ?? ""}-${safeOverlayStep}-${revealCardKind ?? ""}-${terminalFullReveal ? "full" : "play"}`}
              className={cn(
                "relative z-[1] flex h-full w-full min-w-0 items-center justify-center py-0.5",
                terminalFullReveal ? "max-h-[min(90vh,720px)]" : "max-h-[min(72vh,520px)]",
              )}
            >
              {useReveal && revealCardKind ? (
                <div className="animate-slide-step flex w-full justify-center">
                  <StepCardPreview
                    imageUrl={imageUrl}
                    seed={revealSeed!}
                    step={safeOverlayStep}
                    revealCardKind={revealCardKind}
                    cardTemplateKey={cardTemplateKey}
                    terminalFullReveal={terminalFullReveal}
                    alt={alt}
                    className={
                      terminalFullReveal
                        ? "w-full max-w-full"
                        : "w-[min(100%,280px)] max-w-full shrink-0 sm:w-[min(100%,320px)]"
                    }
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

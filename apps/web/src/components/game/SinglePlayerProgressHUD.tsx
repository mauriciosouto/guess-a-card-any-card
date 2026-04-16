import { StepIndicator } from "@/components/game/StepIndicator";
import { VeilProgressBar } from "@/components/game/VeilProgressBar";
import { cn } from "@/lib/utils/cn";

export type SinglePlayerProgressHUDProps = {
  currentStep: number;
  totalSteps: number;
  attemptsUsed: number;
  attemptsRemaining: number;
  className?: string;
};

/**
 * Step / veil clarity: explicit “X of Y”, linear progress, attempts, and arcane dots.
 */
export function SinglePlayerProgressHUD({
  currentStep,
  totalSteps,
  attemptsUsed,
  attemptsRemaining,
  className,
}: SinglePlayerProgressHUDProps) {
  const safeTotal = Math.max(1, totalSteps);
  const safeCurrent = Math.min(Math.max(1, currentStep), safeTotal);

  return (
    <div className={cn("flex w-full flex-col gap-4", className)}>
      <div className="text-center">
        <p className="font-display text-[0.62rem] font-semibold uppercase tracking-[0.28em] text-[var(--gold-dim)]">
          The veil thins
        </p>
        <p className="mt-2 font-display text-lg font-semibold tracking-[0.14em] text-[var(--gold-bright)] sm:text-xl">
          Step{" "}
          <span className="tabular-nums text-[var(--parchment)]">{safeCurrent}</span>
          <span className="mx-1.5 text-[var(--mist)]/80">of</span>
          <span className="tabular-nums text-[var(--parchment)]">{safeTotal}</span>
        </p>
      </div>

      <VeilProgressBar current={safeCurrent} total={safeTotal} />

      <StepIndicator current={safeCurrent} total={safeTotal} className="w-full max-w-none" />

      <div className="rounded-lg border border-[var(--gold)]/12 bg-[var(--void)]/40 px-4 py-3 text-center">
        <p className="font-display text-[0.6rem] font-semibold uppercase tracking-[0.24em] text-[var(--gold-dim)]">
          Attempts
        </p>
        <p className="mt-2 text-sm text-[var(--parchment)]">
          <span className="font-display text-[var(--gold-bright)]">{attemptsRemaining}</span>
          <span className="text-[var(--mist)]"> remaining</span>
          <span className="mx-2 text-[var(--wine-deep)]" aria-hidden>
            ·
          </span>
          <span className="text-[var(--mist)]">{attemptsUsed} sealed</span>
        </p>
      </div>
    </div>
  );
}

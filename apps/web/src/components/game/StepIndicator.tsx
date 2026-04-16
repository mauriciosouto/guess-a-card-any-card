import { Fragment } from "react";
import { cn } from "@/lib/utils/cn";

export type StepIndicatorProps = {
  current: number;
  /** Total veils / steps in this ritual (usually fixed puzzle step count). */
  total: number;
  className?: string;
};

/**
 * Arcane progress — all steps visible: past (sealed), current (lit), future (waiting).
 */
export function StepIndicator({ current, total, className }: StepIndicatorProps) {
  const safeTotal = Math.max(1, total);
  const safeCurrent = Math.min(Math.max(1, current), safeTotal);
  const steps = Array.from({ length: safeTotal }, (_, i) => i + 1);

  return (
    <div
      className={cn(
        "flex w-full min-w-0 max-w-full flex-col items-center gap-2",
        className,
      )}
      role="status"
      aria-label={`Veil ${safeCurrent} of ${safeTotal}`}
    >
      <div className="flex w-full min-w-0 max-w-full items-center justify-center px-0.5">
        {steps.map((n, i) => (
          <Fragment key={n}>
            <div className="flex min-w-0 flex-1 basis-0 flex-col items-center justify-center">
              <div
                className={cn(
                  "relative z-[1] aspect-square max-h-3.5 max-w-3.5 min-h-1.5 min-w-1.5 w-[min(0.875rem,100%)] rounded-full border-2 transition-[transform,box-shadow,background-color,border-color,opacity] duration-300",
                  n < safeCurrent &&
                    "border-[var(--gold-dim)]/90 bg-[var(--gold-dim)]/85 opacity-95 shadow-[0_0_8px_rgba(138,107,28,0.35)]",
                  n === safeCurrent &&
                    "scale-125 border-[var(--gold-bright)] bg-[var(--gold)] shadow-[0_0_22px_rgba(240,228,184,0.45)]",
                  n > safeCurrent &&
                    "border-[var(--mist)]/45 bg-[var(--plum-mid)]/90 opacity-100 shadow-[inset_0_0_0_1px_rgba(201,162,39,0.12)]",
                )}
              />
            </div>
            {i < safeTotal - 1 ? (
              <div
                className={cn(
                  "h-0.5 min-w-0 flex-1 basis-0 self-center rounded-full transition-colors duration-300",
                  n < safeCurrent
                    ? "bg-gradient-to-r from-[var(--gold)]/65 to-[var(--gold-dim)]/50"
                    : "bg-[var(--wine-deep)]/55",
                )}
                aria-hidden
              />
            ) : null}
          </Fragment>
        ))}
      </div>
    </div>
  );
}

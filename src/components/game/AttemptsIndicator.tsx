import { cn } from "@/lib/utils/cn";

export type AttemptsIndicatorProps = {
  used: number;
  remaining: number;
  className?: string;
};

export function AttemptsIndicator({
  used,
  remaining,
  className,
}: AttemptsIndicatorProps) {
  return (
    <div className={cn("flex flex-col items-center gap-2 text-center", className)}>
      <p className="font-display text-[0.62rem] font-semibold uppercase tracking-[0.26em] text-[var(--gold-dim)]">
        Whispers against the veil
      </p>
      <div className="flex items-center justify-center gap-4 text-[0.7rem] uppercase tracking-[0.2em] text-[var(--mist)] sm:text-xs">
        <span>
          <span className="font-display text-[var(--gold-bright)]">Used</span>{" "}
          <span className="tabular-nums text-[var(--parchment)]">{used}</span>
        </span>
        <span className="h-4 w-px bg-[var(--gold)]/25" aria-hidden />
        <span>
          <span className="font-display text-[var(--gold-bright)]">Remains</span>{" "}
          <span className="tabular-nums text-[var(--parchment)]">{remaining}</span>
        </span>
      </div>
    </div>
  );
}

import { cn } from "@/lib/utils/cn";

export type VeilProgressBarProps = {
  current: number;
  total: number;
  className?: string;
};

export function VeilProgressBar({ current, total, className }: VeilProgressBarProps) {
  const safeTotal = Math.max(1, total);
  const safeCurrent = Math.min(Math.max(0, current), safeTotal);
  const pct = (safeCurrent / safeTotal) * 100;

  return (
    <div
      className={cn("w-full", className)}
      role="progressbar"
      aria-valuenow={safeCurrent}
      aria-valuemin={0}
      aria-valuemax={safeTotal}
      aria-label={`Veil progress ${safeCurrent} of ${safeTotal}`}
    >
      <div className="h-2 w-full overflow-hidden rounded-full border border-[var(--gold)]/18 bg-[var(--wine-deep)]/85 shadow-[inset_0_1px_3px_rgba(0,0,0,0.45)]">
        <div
          className="h-full rounded-full bg-gradient-to-r from-[var(--gold-dim)] via-[var(--gold)] to-[var(--gold-bright)] shadow-[0_0_14px_rgba(201,162,39,0.4)] transition-[width] duration-500 ease-out"
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

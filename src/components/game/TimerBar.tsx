"use client";

import { cn } from "@/lib/utils/cn";

export type TimerBarProps = {
  fractionRemaining: number;
  className?: string;
};

export function TimerBar({ fractionRemaining, className }: TimerBarProps) {
  const pct = Math.max(0, Math.min(1, fractionRemaining)) * 100;

  return (
    <div
      className={cn(
        "h-2 w-full overflow-hidden rounded-full border border-[var(--wine-deep)] bg-[var(--void)]/80 shadow-inner",
        className,
      )}
    >
      <div
        className="h-full rounded-full bg-gradient-to-r from-[var(--gold-dim)] via-[var(--gold)] to-[var(--gold-bright)] shadow-[0_0_14px_rgba(201,162,39,0.35)] transition-[width] duration-300 ease-linear"
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}

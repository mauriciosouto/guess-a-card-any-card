import type { ReactNode } from "react";
import { cn } from "@/lib/utils/cn";

export type EmptyStateWellProps = {
  title: string;
  description: string;
  className?: string;
  children?: ReactNode;
  /** Visually de-emphasize (e.g. under a list heading). */
  compact?: boolean;
};

/**
 * On-brand empty state: dark panel, light ornament, no loading/error styling.
 */
export function EmptyStateWell({
  title,
  description,
  className,
  children,
  compact,
}: EmptyStateWellProps) {
  return (
    <div
      className={cn(
        "rounded-lg border border-[var(--gold)]/15 bg-gradient-to-b from-[var(--plum-mid)]/25 to-[var(--void)]/40 text-center",
        "shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]",
        compact ? "px-3 py-4 sm:py-4 sm:text-left" : "px-4 py-8 sm:px-6 sm:py-9 sm:text-left",
        className,
      )}
    >
      <p
        className={cn("font-display text-[var(--gold)]/30", compact ? "text-lg" : "text-2xl")}
        aria-hidden
      >
        ✦
      </p>
      <h3
        className={cn(
          "font-display font-semibold text-[var(--parchment)]",
          compact
            ? "mt-0.5 text-sm tracking-[0.08em]"
            : "mt-1.5 text-base tracking-[0.1em] sm:text-lg",
        )}
      >
        {title}
      </h3>
      <p
        className={cn(
          "text-[var(--parchment-dim)]",
          compact ? "mt-1.5 text-xs leading-relaxed" : "mt-2 text-sm leading-relaxed",
        )}
      >
        {description}
      </p>
      {children ? (
        <div
          className={cn(
            "mt-4 flex flex-wrap items-center justify-center gap-2",
            "sm:justify-start",
          )}
        >
          {children}
        </div>
      ) : null}
    </div>
  );
}

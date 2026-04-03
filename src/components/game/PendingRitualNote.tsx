import { cn } from "@/lib/utils/cn";

export type PendingRitualNoteProps = {
  /** When false, renders nothing. */
  show: boolean;
  label: string;
  className?: string;
  /** Use end alignment when placed under a right-aligned control. */
  align?: "start" | "end";
};

/**
 * Short-lived feedback while an async ritual (start game, submit guess) is in flight.
 */
export function PendingRitualNote({
  show,
  label,
  className,
  align = "start",
}: PendingRitualNoteProps) {
  if (!show) return null;

  return (
    <p
      className={cn(
        "mt-2 flex w-full min-w-0 items-center gap-2 text-[0.7rem] text-[var(--gold-dim)]",
        align === "end" && "justify-end text-right",
        className,
      )}
      role="status"
      aria-live="polite"
    >
      <span
        className="inline-block size-3.5 shrink-0 rounded-full border-2 border-[var(--gold-dim)] border-t-[var(--gold-bright)] animate-spin"
        aria-hidden
      />
      <span className="font-display font-medium uppercase leading-snug tracking-[0.14em]">
        {label}
      </span>
    </p>
  );
}

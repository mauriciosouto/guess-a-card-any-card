import { Panel } from "@/components/ui/panel";
import { cn } from "@/lib/utils/cn";

export type TurnIndicatorProps = {
  activePlayerName?: string;
  /** Emphasize when the current viewer may submit a guess. */
  emphasizeActive?: boolean;
  className?: string;
};

export function TurnIndicator({ activePlayerName, emphasizeActive, className }: TurnIndicatorProps) {
  return (
    <Panel
      variant="subtle"
      className={cn(
        "mx-auto w-full max-w-md px-4 py-4 text-center text-sm text-[var(--parchment-dim)] sm:px-6 sm:py-5",
        emphasizeActive
          ? "border-[var(--gold-bright)]/45 bg-[var(--gold)]/8 shadow-[0_0_24px_rgba(212,175,55,0.12)]"
          : "border-[var(--gold)]/10",
        className,
      )}
    >
      {activePlayerName ? (
        <>
          <span className="font-display text-[0.65rem] font-semibold uppercase tracking-[0.2em] text-[var(--gold-dim)]">
            Voice of the circle
          </span>
          <p className="mt-2 font-medium text-[var(--gold-bright)]">{activePlayerName}</p>
        </>
      ) : (
        "The speaking order binds when the ritual opens."
      )}
    </Panel>
  );
}

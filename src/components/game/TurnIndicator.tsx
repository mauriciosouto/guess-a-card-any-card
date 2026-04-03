import { Panel } from "@/components/ui/panel";

export type TurnIndicatorProps = {
  activePlayerName?: string;
};

export function TurnIndicator({ activePlayerName }: TurnIndicatorProps) {
  return (
    <Panel
      variant="subtle"
      className="mx-auto w-full max-w-md border-[var(--gold)]/10 px-4 py-4 text-center text-sm text-[var(--parchment-dim)] sm:px-6 sm:py-5"
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

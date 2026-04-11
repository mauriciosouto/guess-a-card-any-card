import { Panel } from "@/components/ui/panel";

export type PlayerStatusItem = {
  id: string;
  displayName: string;
  hasSubmitted: boolean;
  isSolved: boolean;
  /** Competitive: wrong on final step */
  isEliminated?: boolean;
  /** When match ended */
  finalRank?: number | null;
};

export type PlayerStatusListProps = {
  players: PlayerStatusItem[];
};

export function PlayerStatusList({ players }: PlayerStatusListProps) {
  if (players.length === 0) {
    return (
      <Panel variant="subtle" className="border-[var(--gold)]/10 text-sm text-[var(--mist)]">
        No seers have joined this circle yet.
      </Panel>
    );
  }

  return (
    <ul className="space-y-2">
      {players.map((p) => (
        <li key={p.id}>
          <Panel
            variant="subtle"
            className="flex justify-between gap-4 border-[var(--gold)]/08 py-3 text-sm"
          >
            <span className="font-medium text-[var(--parchment)]">{p.displayName}</span>
                       <span className="flex flex-wrap items-center justify-end gap-x-2 gap-y-1 text-[0.7rem] uppercase tracking-[0.14em] text-[var(--mist)]">
              {p.finalRank != null ? (
                <span className="tabular-nums text-[var(--gold-dim)]">#{p.finalRank}</span>
              ) : null}
              {p.isSolved ? (
                <span className="text-emerald-300/90">Unveiled</span>
              ) : p.isEliminated ? (
                <span className="text-[var(--blood)]/90">Out</span>
              ) : p.hasSubmitted ? (
                <span className="text-[var(--gold-bright)]">Sealed</span>
              ) : (
                <span>Awaiting</span>
              )}
            </span>
          </Panel>
        </li>
      ))}
    </ul>
  );
}

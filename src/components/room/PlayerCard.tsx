import { Panel } from "@/components/ui/panel";

export type PlayerCardProps = {
  displayName: string;
  isHost?: boolean;
  avatarLabel?: string;
};

export function PlayerCard({
  displayName,
  isHost,
  avatarLabel,
}: PlayerCardProps) {
  return (
    <Panel variant="subtle" className="flex items-center gap-3 border-[var(--gold)]/10 py-2">
      <div className="flex h-10 w-10 items-center justify-center rounded-full border border-[var(--gold)]/25 bg-[var(--void)]/80 text-xs text-[var(--gold-dim)]">
        {avatarLabel ?? "?"}
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-[var(--parchment)]">
          {displayName}
        </p>
        {isHost ? (
          <p className="font-display text-[0.65rem] uppercase tracking-[0.18em] text-[var(--gold-bright)]">
            Ward of the circle
          </p>
        ) : null}
      </div>
    </Panel>
  );
}

import { Panel } from "@/components/ui/panel";

export type RoomLobbyProps = {
  roomId?: string;
};

export function RoomLobby({ roomId }: RoomLobbyProps) {
  return (
    <Panel variant="subtle" className="space-y-4 border-[var(--gold)]/12">
      <p className="text-sm leading-relaxed text-[var(--parchment-dim)]">
        Seers who share your thread will gather names here — choice of sets, ward of the host, and
        the moment the veil is chosen wait on the wire between servers.
      </p>
      {roomId ? (
        <p className="font-mono text-xs tracking-wide text-[var(--gold-dim)]">
          Knot id: <span className="text-[var(--mist)]">{roomId}</span>
        </p>
      ) : null}
    </Panel>
  );
}

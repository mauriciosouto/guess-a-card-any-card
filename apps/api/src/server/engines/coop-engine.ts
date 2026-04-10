/**
 * Cooperative mode — blueprint §3.3, §28.11.
 * Pure helpers; persistence lives in coop-service.
 */

export function shuffleRoomPlayerIds(ids: string[]): string[] {
  const copy = [...ids];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

export type TurnOrderedPlayer = { id: string; turnOrder: number | null };

/** Next speaker in fixed COOP order (wraps). */
export function nextActiveRoomPlayerId(
  players: TurnOrderedPlayer[],
  currentActiveId: string,
): string | null {
  const ordered = [...players]
    .filter((p) => p.turnOrder != null)
    .sort((a, b) => (a.turnOrder ?? 0) - (b.turnOrder ?? 0));
  if (ordered.length === 0) return null;
  const idx = ordered.findIndex((p) => p.id === currentActiveId);
  if (idx === -1) return ordered[0]!.id;
  return ordered[(idx + 1) % ordered.length]!.id;
}

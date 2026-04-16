"use client";

import { getOrCreateGuestId } from "@/lib/coop/guest-id";
import { singleFetch } from "@/lib/single/single-api";
import type { SingleGameSnapshot } from "@/types/single-game";

export async function loadSingleGameSnapshot(gameId: string): Promise<SingleGameSnapshot> {
  getOrCreateGuestId();
  const res = await singleFetch(`/games/${gameId}`);
  if (!res.ok) {
    const j = (await res.json().catch(() => ({}))) as { error?: string };
    throw new Error(j.error ?? "Could not load game");
  }
  return (await res.json()) as SingleGameSnapshot;
}

export async function startSingleGameSession(
  selectedFabSets: string[],
): Promise<{ gameId: string; game: SingleGameSnapshot }> {
  getOrCreateGuestId();
  const res = await singleFetch("/games", {
    method: "POST",
    body: JSON.stringify({ selectedFabSets }),
  });
  if (!res.ok) {
    const j = (await res.json().catch(() => ({}))) as { error?: string };
    throw new Error(j.error ?? "Could not start");
  }
  return (await res.json()) as { gameId: string; game: SingleGameSnapshot };
}

export async function submitSingleGuess(
  gameId: string,
  guessText: string,
  timeTakenMs: number,
): Promise<SingleGameSnapshot> {
  const res = await singleFetch(`/games/${gameId}/guess`, {
    method: "POST",
    body: JSON.stringify({ guessText, timeTakenMs }),
  });
  if (!res.ok) {
    const j = (await res.json().catch(() => ({}))) as { error?: string };
    throw new Error(j.error ?? "Guess failed");
  }
  return (await res.json()) as SingleGameSnapshot;
}

export async function forfeitSingleGame(gameId: string): Promise<SingleGameSnapshot> {
  const res = await singleFetch(`/games/${gameId}/forfeit`, { method: "POST" });
  if (!res.ok) {
    const j = (await res.json().catch(() => ({}))) as { error?: string };
    throw new Error(j.error ?? "Could not end game");
  }
  return (await res.json()) as SingleGameSnapshot;
}

"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { AttemptsIndicator } from "@/components/game/AttemptsIndicator";
import { GameHistoryPanel, type HistoryEntry } from "@/components/game/GameHistoryPanel";
import { GuessCardAutocomplete } from "@/components/game/GuessCardAutocomplete";
import { PendingRitualNote } from "@/components/game/PendingRitualNote";
import { PuzzleViewer } from "@/components/game/PuzzleViewer";
import { SetMultiSelect } from "@/components/game/SetMultiSelect";
import { StepIndicator } from "@/components/game/StepIndicator";
import { Button } from "@/components/ui/button";
import { Panel } from "@/components/ui/panel";
import { getOrCreateGuestId } from "@/lib/coop/guest-id";
import { PUZZLE_STEP_COUNT } from "@/lib/puzzle/deterministicStep";
import { singleFetch } from "@/lib/single/single-api";
import { cn } from "@/lib/utils/cn";

type GameSnap = {
  id: string;
  status: string;
  currentStep: number | null;
  totalSteps: number;
  cardImageUrl: string;
  puzzleSeed: string;
  currentImageUrl: string | null;
  cardName: string | null;
  dataSource: string | null;
  fabSet: string | null;
  attemptCount: number;
  attemptsUsed: number;
  attemptsRemaining: number;
  guesses: Array<{
    id: string;
    stepNumber: number;
    guessText: string;
    isCorrect: boolean;
    createdAt: string;
  }>;
};

export function SinglePlayerClient() {
  const [phase, setPhase] = useState<"setup" | "play" | "done">("setup");
  const [sets, setSets] = useState<string[]>([]);
  const [setsLoading, setSetsLoading] = useState(true);
  const [selectedFabSets, setSelectedFabSets] = useState<Set<string>>(new Set());
  const [gameId, setGameId] = useState<string | null>(null);
  const [game, setGame] = useState<GameSnap | null>(null);
  const [guess, setGuess] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [asyncFeedback, setAsyncFeedback] = useState<string | null>(null);
  const stepStartedAt = useRef(Date.now());

  const loadSets = useCallback(async () => {
    setSetsLoading(true);
    try {
      const res = await singleFetch("/sets");
      if (res.ok) {
        const j = (await res.json()) as { sets: string[] };
        setSets(j.sets ?? []);
      } else {
        setSets([]);
      }
    } finally {
      setSetsLoading(false);
    }
  }, []);

  const refreshGame = useCallback(async (id: string) => {
    getOrCreateGuestId();
    const res = await singleFetch(`/games/${id}`);
    if (!res.ok) {
      const j = (await res.json().catch(() => ({}))) as { error?: string };
      setError(j.error ?? "Could not load game");
      return;
    }
    const j = (await res.json()) as GameSnap;
    setGame(j);
    if (j.status === "WON" || j.status === "LOST") setPhase("done");
    else setPhase("play");
  }, []);

  useEffect(() => {
    void loadSets();
  }, [loadSets]);

  useEffect(() => {
    if (game?.currentStep != null) stepStartedAt.current = Date.now();
  }, [game?.currentStep, game?.id]);

  useEffect(() => {
    if (!gameId || phase !== "play") return;
    const t = window.setInterval(() => void refreshGame(gameId), 3200);
    return () => window.clearInterval(t);
  }, [gameId, phase, refreshGame]);

  async function onStart() {
    setBusy(true);
    setAsyncFeedback("Drawing a veil from the archive…");
    setError(null);
    getOrCreateGuestId();
    try {
      const res = await singleFetch("/games", {
        method: "POST",
        body: JSON.stringify({
          selectedFabSets: [...selectedFabSets],
        }),
      });
      if (!res.ok) {
        const j = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(j.error ?? "Could not start");
      }
      const j = (await res.json()) as { gameId: string };
      setGameId(j.gameId);
      await refreshGame(j.gameId);
      setPhase("play");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed");
    } finally {
      setAsyncFeedback(null);
      setBusy(false);
    }
  }

  async function onSubmitGuess() {
    if (!gameId) return;
    setBusy(true);
    setAsyncFeedback("Sealing your guess — the archive listens…");
    setError(null);
    try {
      const timeTakenMs = Date.now() - stepStartedAt.current;
      const res = await singleFetch(`/games/${gameId}/guess`, {
        method: "POST",
        body: JSON.stringify({ guessText: guess, timeTakenMs }),
      });
      if (!res.ok) {
        const j = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(j.error ?? "Guess failed");
      }
      setGuess("");
      await refreshGame(gameId);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Guess failed");
    } finally {
      setAsyncFeedback(null);
      setBusy(false);
    }
  }

  function reset() {
    setPhase("setup");
    setGameId(null);
    setGame(null);
    setGuess("");
    setError(null);
    setAsyncFeedback(null);
  }

  const historyEntries: HistoryEntry[] =
    game?.guesses
      .slice()
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
      .map((g) => ({
        id: g.id,
        step: g.stepNumber,
        guess: g.guessText,
        outcome: g.isCorrect ? ("correct" as const) : ("wrong" as const),
        at: g.createdAt,
      })) ?? [];

  if (phase === "setup") {
    return (
      <div className="space-y-6">
        {error ? (
          <p className="rounded-lg border border-[var(--blood)]/35 bg-[var(--blood)]/10 px-3 py-2 text-center text-sm text-[var(--gold-bright)]">
            {error}
          </p>
        ) : null}
        <Panel variant="textured" className="border-[var(--gold)]/15 p-5 sm:p-6">
          <p className="text-sm leading-relaxed text-[var(--parchment-dim)]">
            Mark optional <strong className="text-[var(--parchment)]">sigils</strong> to thin which omens may
            rise from the archive, or leave them untouched and let any ready veil answer your summons.
          </p>
          <p className="mt-6 font-display text-[0.65rem] font-semibold uppercase tracking-[0.22em] text-[var(--gold-dim)]">
            Optional sigils
          </p>
          <div className="mt-3">
            <SetMultiSelect
              options={sets}
              value={selectedFabSets}
              onChange={setSelectedFabSets}
              disabled={busy}
              loading={setsLoading}
            />
          </div>
          <div className="mt-8 flex flex-wrap gap-3">
            <Button onClick={() => void onStart()} disabled={busy || setsLoading}>
              Start
            </Button>
            <Button variant="outline" asChild>
              <Link href="/">Home</Link>
            </Button>
          </div>
          <PendingRitualNote
            show={busy && Boolean(asyncFeedback)}
            label={asyncFeedback ?? ""}
          />
        </Panel>
      </div>
    );
  }

  if (phase === "done" && game) {
    const won = game.status === "WON";
    return (
      <div className="mx-auto max-w-lg space-y-6 text-center">
        <Panel variant="textured" className="border-[var(--gold)]/20 p-6 sm:p-8">
          {won ? (
            <div
              className="rounded-xl border-2 border-emerald-600/45 bg-emerald-950/30 px-4 py-6 shadow-[0_0_48px_rgba(52,211,153,0.18)] sm:px-6 sm:py-8 animate-pulse-win"
            >
              <p className="font-display text-2xl font-semibold leading-snug tracking-[0.12em] text-emerald-100 sm:text-3xl">
                The veil opens
              </p>
              <p className="mx-auto mt-3 max-w-md font-display text-[0.7rem] font-semibold uppercase leading-relaxed tracking-[0.22em] text-emerald-200/85 sm:text-xs">
                You named the card — the omen is answered.
              </p>
            </div>
          ) : (
            <p className="font-display text-xl font-semibold tracking-[0.14em] text-[var(--gold-bright)]">
              The veil closed
            </p>
          )}
          <p className={cn("mt-6 text-lg text-[var(--parchment)]", won && "mt-8")}>
            {game.cardName}
            {game.dataSource ? (
              <span className="mt-1 block text-sm text-[var(--parchment-dim)]">{game.dataSource}</span>
            ) : null}
            {game.fabSet ? (
              <span className="mt-1 block text-xs text-[var(--mist)]">FAB set: {game.fabSet}</span>
            ) : null}
          </p>
          <PuzzleViewer
            imageUrl={game.cardImageUrl}
            alt={game.cardName ?? "Card"}
            stepKey="end"
            className="mx-auto mt-6 max-w-sm"
          />
          <p className="mt-4 text-sm text-[var(--mist)]">Attempts: {game.attemptCount}</p>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <Button onClick={reset}>Play again</Button>
            <Button variant="outline" asChild>
              <Link href="/">Home</Link>
            </Button>
          </div>
        </Panel>
        <GameHistoryPanel entries={historyEntries} />
      </div>
    );
  }

  if (!game) {
    return <p className="text-center text-sm text-[var(--parchment-dim)]">Summoning the card…</p>;
  }

  const inProgress = game.status === "IN_PROGRESS";

  return (
    <div className="grid gap-8 pb-24 lg:grid-cols-[minmax(0,1fr)_minmax(240px,300px)] lg:items-start lg:gap-10 lg:pb-0">
      {error ? (
        <p className="lg:col-span-2 rounded-lg border border-[var(--blood)]/35 bg-[var(--blood)]/10 px-3 py-2 text-center text-sm text-[var(--gold-bright)]">
          {error}
        </p>
      ) : null}
      <div className="flex min-w-0 flex-col items-center gap-6">
        <div className="flex w-full max-w-lg flex-col items-stretch gap-6 lg:max-w-none">
          <StepIndicator
            current={game.currentStep ?? 1}
            total={PUZZLE_STEP_COUNT}
            className="w-full max-w-none"
          />
          <AttemptsIndicator used={game.attemptsUsed} remaining={game.attemptsRemaining} />
          <PuzzleViewer
            imageUrl={game.cardImageUrl}
            puzzleSeed={game.puzzleSeed}
            puzzleStep={game.currentStep ?? 1}
            alt="Veiled card"
            stepKey={`${game.id}-${game.currentStep ?? 0}`}
            className="w-full max-w-lg lg:max-w-none"
          />
        </div>
      </div>

      <div className="relative z-20 flex min-w-0 flex-col gap-6 lg:sticky lg:top-28 lg:self-start">
        <div className="relative z-30">
          <Panel variant="subtle" className="border-[var(--gold)]/12 p-4 sm:p-5">
            <GuessCardAutocomplete
              value={guess}
              onChange={setGuess}
              onSubmit={() => void onSubmitGuess()}
              disabled={!inProgress || busy}
              placeholder="Exact card name (FaB)…"
              submitLabel="Seal guess"
              asyncFeedback={busy ? asyncFeedback : null}
            />
          </Panel>
        </div>
        <GameHistoryPanel entries={historyEntries} />
      </div>
    </div>
  );
}

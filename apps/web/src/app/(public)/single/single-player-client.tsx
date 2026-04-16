"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { GameHistoryPanel, type HistoryEntry } from "@/components/game/GameHistoryPanel";
import { GuessCardAutocomplete } from "@/components/game/GuessCardAutocomplete";
import { PendingRitualNote } from "@/components/game/PendingRitualNote";
import { PuzzleViewer } from "@/components/game/PuzzleViewer";
import { SetMultiSelect } from "@/components/game/SetMultiSelect";
import { SinglePlayerProgressHUD } from "@/components/game/SinglePlayerProgressHUD";
import { Button } from "@/components/ui/button";
import { Panel } from "@/components/ui/panel";
import { useSinglePlayerFabSets, useSinglePlayerSession } from "@/hooks/use-single-player-game";
import type { SingleGameSnapshot } from "@/types/single-game";
import { cn } from "@/lib/utils/cn";

const WRONG_FEEDBACK_MS = 720;
const TRIUMPH_MS = 1600;

function useGuessFeedback(game: SingleGameSnapshot | null, phase: string) {
  const prevRef = useRef<SingleGameSnapshot | null>(null);
  const [wrongFeedback, setWrongFeedback] = useState(false);

  useEffect(() => {
    if (!game || phase !== "play") {
      prevRef.current = game;
      return;
    }
    const prev = prevRef.current;
    prevRef.current = game;
    if (!prev || prev.id !== game.id) return;
    if (prev.status !== "IN_PROGRESS" || game.status !== "IN_PROGRESS") return;
    if (game.attemptCount <= prev.attemptCount) return;

    const sorted = [...game.guesses].sort(
      (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
    );
    const last = sorted[sorted.length - 1];
    if (last && !last.isCorrect) {
      const show = window.setTimeout(() => setWrongFeedback(true), 0);
      const hide = window.setTimeout(() => setWrongFeedback(false), WRONG_FEEDBACK_MS);
      return () => {
        window.clearTimeout(show);
        window.clearTimeout(hide);
      };
    }
  }, [game, phase]);

  return wrongFeedback;
}

export function SinglePlayerClient() {
  const { sets, setsLoading } = useSinglePlayerFabSets();
  const [selectedFabSets, setSelectedFabSets] = useState<Set<string>>(new Set());
  const {
    phase,
    game,
    guess,
    setGuess,
    error,
    busy,
    asyncFeedback,
    start,
    submitGuess,
    forfeit,
    reset,
  } = useSinglePlayerSession();

  const wrongFeedback = useGuessFeedback(game, phase);
  const [triumphActive, setTriumphActive] = useState(false);

  useEffect(() => {
    if (phase === "done" && game?.status === "WON") {
      const show = window.setTimeout(() => setTriumphActive(true), 0);
      const hide = window.setTimeout(() => setTriumphActive(false), TRIUMPH_MS);
      return () => {
        window.clearTimeout(show);
        window.clearTimeout(hide);
      };
    }
    const off = window.setTimeout(() => setTriumphActive(false), 0);
    return () => window.clearTimeout(off);
  }, [phase, game?.status, game?.id]);

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

  const totalSteps = game ? Math.max(1, game.totalSteps) : 1;

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
            <Button
              onClick={() => void start([...selectedFabSets])}
              disabled={busy || setsLoading}
            >
              Start
            </Button>
            <Button variant="outline" asChild>
              <Link href="/">Home</Link>
            </Button>
          </div>
          <PendingRitualNote show={busy && Boolean(asyncFeedback)} label={asyncFeedback ?? ""} />
        </Panel>
      </div>
    );
  }

  if (phase === "done" && game) {
    const won = game.status === "WON";
    return (
      <div className="mx-auto max-w-lg space-y-8 text-center">
        <Panel variant="textured" className="border-[var(--gold)]/25 p-6 sm:p-10">
          <p className="font-display text-[0.62rem] font-semibold uppercase tracking-[0.32em] text-[var(--gold-dim)]">
            {won ? "Omen resolved" : "Reading ended"}
          </p>

          {won ? (
            <div
              className={cn(
                "mt-5 rounded-xl border-2 border-emerald-600/45 bg-emerald-950/30 px-4 py-6 shadow-[0_0_48px_rgba(52,211,153,0.18)] sm:px-6 sm:py-8",
                "animate-pulse-win",
              )}
            >
              <p className="font-display text-2xl font-semibold leading-snug tracking-[0.12em] text-emerald-100 sm:text-3xl">
                The veil opens
              </p>
              <p className="mx-auto mt-3 max-w-md font-display text-[0.7rem] font-semibold uppercase leading-relaxed tracking-[0.22em] text-emerald-200/85 sm:text-xs">
                You named the card — the omen is answered.
              </p>
            </div>
          ) : (
            <div className="mt-6 space-y-2 rounded-xl border border-[var(--blood)]/35 bg-[var(--blood)]/08 px-4 py-6">
              <p className="font-display text-xl font-semibold tracking-[0.14em] text-[var(--gold-bright)] sm:text-2xl">
                The veil closed
              </p>
              <p className="text-sm text-[var(--parchment-dim)]">
                The true name was not spoken in time — study the sigil log and return when the stars align.
              </p>
            </div>
          )}

          <div className={cn("mt-8 space-y-2", won ? "mt-10" : "mt-8")}>
            <p className="font-display text-[0.65rem] font-semibold uppercase tracking-[0.22em] text-[var(--gold-dim)]">
              Named card
            </p>
            <h2 className="text-gradient-gold font-display text-2xl font-semibold leading-snug tracking-[0.06em] sm:text-3xl">
              {game.cardName}
            </h2>
            <div className="flex flex-wrap items-center justify-center gap-x-3 gap-y-1 text-sm text-[var(--parchment-dim)]">
              {game.dataSource ? <span>{game.dataSource}</span> : null}
              {game.fabSet ? (
                <span className="text-[var(--mist)]">
                  <span className="text-[var(--gold-dim)]">FAB</span> {game.fabSet}
                </span>
              ) : null}
            </div>
          </div>

          <div
            className={cn(
              "relative mx-auto mt-8 max-w-sm overflow-visible rounded-2xl",
              won && triumphActive && "animate-gold-triumph animate-card-reveal-rise",
            )}
          >
            {won ? (
              <div
                className="pointer-events-none absolute -inset-3 -z-10 rounded-3xl opacity-80 blur-2xl"
                style={{
                  background:
                    "radial-gradient(ellipse at center, rgba(201,162,39,0.35) 0%, transparent 65%)",
                }}
                aria-hidden
              />
            ) : null}
            <PuzzleViewer
              imageUrl={game.cardImageUrl}
              puzzleSeed={game.puzzleSeed}
              puzzleStep={totalSteps}
              revealTotalSteps={totalSteps}
              revealCardKind={game.revealCardKind}
              cardTemplateKey={game.cardTemplateKey}
              terminalFullReveal
              alt={game.cardName ?? "Card"}
              stepKey="end"
              className="mx-auto w-full max-w-sm"
            />
          </div>

          <div className="mt-8 rounded-lg border border-[var(--gold)]/12 bg-[var(--void)]/45 px-4 py-3">
            <p className="font-display text-[0.6rem] font-semibold uppercase tracking-[0.24em] text-[var(--gold-dim)]">
              This reading
            </p>
            <p className="mt-1.5 tabular-nums text-sm text-[var(--parchment)]">
              <span className="text-[var(--gold-bright)]">{game.attemptCount}</span>
              <span className="text-[var(--mist)]"> attempts sealed</span>
            </p>
          </div>

          <div className="mt-10 flex flex-wrap justify-center gap-3">
            <Button onClick={reset}>Play again</Button>
            <Button variant="outline" asChild>
              <Link href="/">Home</Link>
            </Button>
          </div>
        </Panel>
        <GameHistoryPanel entries={historyEntries} alwaysShowList />
      </div>
    );
  }

  if (!game) {
    return <p className="text-center text-sm text-[var(--parchment-dim)]">Summoning the card…</p>;
  }

  const inProgress = game.status === "IN_PROGRESS";
  const currentStep = game.currentStep ?? 1;

  return (
    <div
      className={cn(
        "flex flex-col gap-6",
        "pb-[calc(10.5rem+env(safe-area-inset-bottom,0px))] lg:grid lg:grid-cols-[minmax(0,1fr)_minmax(240px,300px)] lg:items-start lg:gap-10 lg:pb-0",
      )}
    >
      {error ? (
        <p className="rounded-lg border border-[var(--blood)]/35 bg-[var(--blood)]/10 px-3 py-2 text-center text-sm text-[var(--gold-bright)] lg:col-span-2">
          {error}
        </p>
      ) : null}

      <div className="order-1 flex min-w-0 flex-col items-center gap-6 lg:max-w-none">
        <SinglePlayerProgressHUD
          currentStep={currentStep}
          totalSteps={totalSteps}
          attemptsUsed={game.attemptsUsed}
          attemptsRemaining={game.attemptsRemaining}
          className="w-full max-w-lg lg:max-w-none"
        />
        <div
          className={cn(
            "w-full max-w-lg overflow-visible rounded-2xl transition-[box-shadow] duration-300 lg:max-w-none",
            wrongFeedback && "animate-guess-wrong ring-2 ring-[var(--blood)]/45",
          )}
        >
          <PuzzleViewer
            imageUrl={game.cardImageUrl}
            puzzleSeed={game.puzzleSeed}
            puzzleStep={currentStep}
            revealTotalSteps={totalSteps}
            revealCardKind={game.revealCardKind}
            cardTemplateKey={game.cardTemplateKey}
            alt="Veiled card"
            stepKey={`${game.id}-${currentStep}`}
            className="w-full max-w-lg lg:max-w-none"
          />
        </div>
      </div>

      <div
        className={cn(
          "order-2 flex min-w-0 flex-col gap-5",
          "fixed inset-x-0 bottom-0 z-40 border-t border-[var(--gold)]/18 bg-[var(--void-deep)]/94 px-4 pt-3 shadow-[0_-16px_48px_rgba(0,0,0,0.55)] backdrop-blur-md",
          "pb-[max(0.75rem,env(safe-area-inset-bottom))]",
          "lg:relative lg:inset-auto lg:z-20 lg:border-0 lg:bg-transparent lg:p-0 lg:shadow-none lg:backdrop-blur-none",
          "lg:sticky lg:top-28 lg:self-start",
        )}
      >
        <div className="relative z-30 mx-auto w-full max-w-lg lg:mx-0 lg:max-w-none">
          <Panel variant="subtle" className="border-[var(--gold)]/14 p-4 sm:p-5 lg:border-[var(--gold)]/12">
            <GuessCardAutocomplete
              value={guess}
              onChange={setGuess}
              onSubmit={() => void submitGuess()}
              disabled={!inProgress || busy}
              placeholder="Exact card name (FaB)…"
              submitLabel="Seal guess"
              asyncFeedback={busy ? asyncFeedback : null}
            />
            {inProgress ? (
              <div className="mt-4 flex flex-wrap gap-2 border-t border-[var(--gold)]/10 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="border-[var(--blood)]/40 text-[var(--parchment-dim)] hover:border-[var(--blood)]/55 hover:text-[var(--blood)]"
                  disabled={busy}
                  onClick={() => void forfeit()}
                >
                  Yield reading
                </Button>
              </div>
            ) : null}
          </Panel>
        </div>
        <GameHistoryPanel
          entries={historyEntries}
          mobileFabClassName="!bottom-[calc(10.75rem+env(safe-area-inset-bottom,0px))]"
          drawerPanelClassName="shadow-[-16px_0_56px_rgba(0,0,0,0.65)] ring-1 ring-[var(--gold)]/15"
        />
      </div>
    </div>
  );
}

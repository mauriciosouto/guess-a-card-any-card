"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { useEffect, useRef, useState } from "react";
import { GameHistoryPanel, type HistoryEntry } from "@/components/game/GameHistoryPanel";
import { GuessCardAutocomplete } from "@/components/game/GuessCardAutocomplete";
import { PendingRitualNote } from "@/components/game/PendingRitualNote";
import { PuzzleViewer } from "@/components/game/PuzzleViewer";
import { SetMultiSelect } from "@/components/game/SetMultiSelect";
import { SinglePlayerProgressHUD } from "@/components/game/SinglePlayerProgressHUD";
import { ModeHowToPanel } from "@/components/onboarding/mode-how-to-panel";
import { ShareGameResultButton } from "@/components/share/share-game-result-button";
import { Button } from "@/components/ui/button";
import { ConfirmModal } from "@/components/ui/confirm-modal";
import { Panel } from "@/components/ui/panel";
import {
  useSinglePlayerFabSets,
  useSinglePlayerSession,
} from "@/hooks/use-single-player-game";
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

type SinglePlayerLobbyProps = {
  error: string | null;
  busy: boolean;
  asyncFeedback: string | null;
  start: (selectedFabSets: string[]) => void | Promise<void>;
};

/** FAB `/sets` fetch only runs when the solitary-reading lobby is shown (not for challenge bootstrap). */
function SinglePlayerLobby({ error, busy, asyncFeedback, start }: SinglePlayerLobbyProps) {
  const { sets, setsLoading } = useSinglePlayerFabSets();
  const [selectedFabSets, setSelectedFabSets] = useState<Set<string>>(new Set());

  return (
    <div className="space-y-6">
      <ModeHowToPanel
        summaryLabel="How Single Player works"
        title="Single Player"
        intro="Practice your card knowledge at your own pace. A hidden Flesh and Blood card is revealed step by step, and your goal is to guess it using the fewest attempts possible."
        howItWorks={SINGLE_HOW_IT_WORKS}
        trackedStats={SINGLE_TRACKED_STATS}
        tips={SINGLE_TIPS}
      />
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
            Start a Solo Run
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

export type SinglePlayerClientProps = {
  /** Skip lobby; load this game (e.g. challenge). */
  initialGameId?: string | null;
  /** Replace default done-screen actions (Play again / Home). */
  doneActions?: ReactNode;
  /** Override forfeit confirmation modal body (defaults to challenge copy when `initialGameId` is set). */
  forfeitConfirmMessage?: string;
};

const CHALLENGE_FORFEIT_CONFIRM =
  "This ends the challenge as abandoned. Continue?";

const SINGLE_HOW_IT_WORKS = [
  "1. Start a solo run - Choose your set filters, or leave them empty to play with the full card pool.",
  "2. Study each reveal step - Every step uncovers one new clue from the card: artwork, type, stats, text, or other visible card information.",
  "3. Make one guess per step - You get one guess after each reveal step. You can guess early if you recognize the card, or wait for more information.",
  "4. Win by guessing the card - If your guess matches the card name, you win immediately.",
  "5. Lose if you run out of steps - If you reach the final reveal without guessing correctly, the run ends as a loss.",
] as const;

const SINGLE_TRACKED_STATS = [
  "games played",
  "wins and losses",
  "best number of attempts",
  "average attempts to win",
  "per-card stats",
  "leaderboard progress",
] as const;

const SINGLE_TIPS = [
  "Look for unique art shapes, pitch/cost clues, and type lines.",
  "Text clues can be powerful, but they may appear later.",
  "Fewer attempts matter more than simply winning.",
] as const;

export function SinglePlayerClient({
  initialGameId = null,
  doneActions,
  forfeitConfirmMessage,
}: SinglePlayerClientProps = {}) {
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
    forfeitModalOpen,
    forfeitMessage,
    requestForfeit,
    dismissForfeit,
    commitForfeit,
    reset,
  } = useSinglePlayerSession(
    initialGameId || forfeitConfirmMessage
      ? {
          initialGameId: initialGameId ?? undefined,
          forfeitConfirmMessage:
            forfeitConfirmMessage ??
            (initialGameId ? CHALLENGE_FORFEIT_CONFIRM : undefined),
        }
      : undefined,
  );

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

  if (!initialGameId && phase === "setup") {
    return (
      <SinglePlayerLobby
        error={error}
        busy={busy}
        asyncFeedback={asyncFeedback}
        start={start}
      />
    );
  }

  if (phase === "done" && game) {
    const won = game.status === "WON";
    const abandoned = game.status === "CANCELLED";
    const cardReveal = (
      <div
        className={cn(
          "relative w-full max-w-sm overflow-visible rounded-2xl sm:max-w-md lg:max-w-lg xl:max-w-xl",
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
          revealSeed={game.revealSeed}
          revealStep={totalSteps}
          revealTotalSteps={totalSteps}
          revealCardKind={game.revealCardKind}
          cardTemplateKey={game.cardTemplateKey}
          terminalFullReveal
          alt={game.cardName ?? "Card"}
          stepKey="end"
          className="mx-auto w-full max-w-sm sm:max-w-md lg:max-w-lg xl:max-w-xl"
        />
      </div>
    );

    return (
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-8 px-4 sm:px-6 xl:max-w-7xl">
        <Panel variant="textured" className="border-[var(--gold)]/25 p-6 sm:p-8">
          <div className="flex flex-col gap-8 lg:flex-row lg:items-center lg:justify-between lg:gap-10">
            <div className="min-w-0 flex-1 text-center lg:text-left">
              <p className="font-display text-[0.62rem] font-semibold uppercase tracking-[0.32em] text-[var(--gold-dim)]">
                {won ? "Omen resolved" : abandoned ? "Reading yielded" : "Reading ended"}
              </p>

              {won ? (
                <div
                  className={cn(
                    "mt-5 rounded-xl border-2 border-emerald-600/45 bg-emerald-950/30 px-4 py-6 shadow-[0_0_48px_rgba(52,211,153,0.18)] sm:px-6 sm:py-7",
                    "animate-pulse-win",
                  )}
                >
                  <p className="font-display text-2xl font-semibold leading-snug tracking-[0.12em] text-emerald-100 sm:text-3xl">
                    The veil opens
                  </p>
                </div>
              ) : abandoned ? (
                <div className="mt-6 space-y-2 rounded-xl border border-[var(--blood)]/35 bg-[var(--blood)]/08 px-4 py-6">
                  <p className="font-display text-xl font-semibold tracking-[0.14em] text-[var(--gold-bright)] sm:text-2xl">
                    The veil was cut short
                  </p>
                  <p className="text-sm text-[var(--parchment-dim)]">
                    You yielded before the omen was answered — the true name remains in the log below.
                  </p>
                </div>
              ) : (
                <div
                  className={cn(
                    "mt-6 rounded-xl border border-[var(--blood)]/35 bg-[var(--blood)]/08 px-4 py-6 sm:px-6 sm:py-7",
                    "flex flex-col gap-3 sm:gap-4 lg:flex-row lg:items-center lg:gap-10",
                  )}
                >
                  <p className="font-display shrink-0 text-xl font-semibold tracking-[0.14em] text-[var(--gold-bright)] sm:text-2xl">
                    The veil closed
                  </p>
                  <p className="text-center text-sm leading-relaxed text-[var(--parchment-dim)] sm:text-left lg:max-w-xl lg:border-l lg:border-[var(--blood)]/25 lg:pl-10">
                    The true name was not spoken in time — study the sigil log and return when the
                    stars align.
                  </p>
                </div>
              )}
            </div>

            <div className="flex shrink-0 flex-col gap-5 border-t border-[var(--gold)]/12 pt-6 text-center lg:w-[min(100%,20rem)] lg:border-l lg:border-t-0 lg:pl-10 lg:pt-0 lg:text-left xl:w-96">
              <div className="space-y-2">
                <p className="font-display text-[0.65rem] font-semibold uppercase tracking-[0.22em] text-[var(--gold-dim)]">
                  Named card
                </p>
                <h2 className="text-gradient-gold font-display text-2xl font-semibold leading-snug tracking-[0.06em] sm:text-3xl">
                  {game.cardName}
                </h2>
                <div className="flex flex-wrap items-center justify-center gap-x-3 gap-y-1 text-sm text-[var(--parchment-dim)] lg:justify-start">
                  {game.dataSource ? <span>{game.dataSource}</span> : null}
                  {game.fabSet ? (
                    <span className="text-[var(--mist)]">
                      <span className="text-[var(--gold-dim)]">FAB</span> {game.fabSet}
                    </span>
                  ) : null}
                </div>
              </div>

              <div className="rounded-lg border border-[var(--gold)]/12 bg-[var(--void)]/45 px-4 py-3">
                <p className="font-display text-[0.6rem] font-semibold uppercase tracking-[0.24em] text-[var(--gold-dim)]">
                  This reading
                </p>
                <p className="mt-1.5 tabular-nums text-sm text-[var(--parchment)]">
                  <span className="text-[var(--gold-bright)]">{game.attemptCount}</span>
                  <span className="text-[var(--mist)]"> attempts sealed</span>
                </p>
              </div>

              <div className="flex flex-wrap items-start justify-center gap-3 lg:justify-start">
                <ShareGameResultButton
                  game={game}
                  mode={initialGameId ? "Challenge" : "Single"}
                />
                {doneActions ?? (
                  <>
                    <Button onClick={reset}>Play again</Button>
                    <Button variant="outline" asChild>
                      <Link href="/">Home</Link>
                    </Button>
                  </>
                )}
              </div>
            </div>
          </div>
        </Panel>

        <div className="flex flex-col gap-8 lg:flex-row lg:items-start lg:gap-10 xl:gap-12">
          <div className="flex min-w-0 flex-1 justify-center lg:justify-start lg:self-start lg:pt-0.5">
            <div className="w-full max-w-sm sm:max-w-md lg:sticky lg:top-24 lg:max-w-none xl:max-w-xl">
              {cardReveal}
            </div>
          </div>
          <div className="min-w-0 lg:w-[min(100%,22rem)] lg:shrink-0 xl:w-96">
            <GameHistoryPanel entries={historyEntries} alwaysShowList className="text-left" />
          </div>
        </div>
      </div>
    );
  }

  if (!game) {
    if (error) {
      return (
        <p className="rounded-lg border border-[var(--blood)]/35 bg-[var(--blood)]/10 px-3 py-2 text-center text-sm text-[var(--gold-bright)]">
          {error}
        </p>
      );
    }
    return <p className="text-center text-sm text-[var(--parchment-dim)]">Summoning the card…</p>;
  }

  const inProgress = game.status === "IN_PROGRESS";
  const currentStep = game.currentStep ?? 1;

  return (
    <>
      <ConfirmModal
        open={forfeitModalOpen}
        title={initialGameId ? "Abandon this challenge?" : "Yield reading?"}
        description={forfeitMessage}
        confirmLabel={initialGameId ? "Abandon" : "Yield"}
        cancelLabel="Stay"
        destructive
        onCancel={dismissForfeit}
        onConfirm={() => void commitForfeit()}
      />
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
            revealSeed={game.revealSeed}
            revealStep={currentStep}
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
                  onClick={requestForfeit}
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
    </>
  );
}

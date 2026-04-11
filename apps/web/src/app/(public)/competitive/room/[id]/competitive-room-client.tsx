"use client";

import type { CompetitiveRoomSnapshot } from "@gac/shared";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { GameHistoryPanel, type HistoryEntry } from "@/components/game/GameHistoryPanel";
import { GuessCardAutocomplete } from "@/components/game/GuessCardAutocomplete";
import { PendingRitualNote } from "@/components/game/PendingRitualNote";
import { PlayerStatusList } from "@/components/game/PlayerStatusList";
import { PuzzleViewer } from "@/components/game/PuzzleViewer";
import { StepIndicator } from "@/components/game/StepIndicator";
import { TimerBar } from "@/components/game/TimerBar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Panel } from "@/components/ui/panel";
import { competitiveFetch } from "@/lib/competitive/competitive-api";

export type CompetitiveRoomClientProps = {
  roomId: string;
};

function useStepTimerFraction(
  inProgress: boolean,
  deadlineIso: string | null,
  timerSec: number | null,
) {
  const [t, setT] = useState(() => Date.now());
  useEffect(() => {
    if (!inProgress || !deadlineIso) return;
    const id = window.setInterval(() => setT(Date.now()), 250);
    return () => window.clearInterval(id);
  }, [inProgress, deadlineIso]);
  if (!inProgress) return 1;
  if (!deadlineIso || !timerSec || timerSec <= 0) return 1;
  const msLeft = new Date(deadlineIso).getTime() - t;
  if (msLeft <= 0) return 0;
  return Math.max(0, Math.min(1, msLeft / (timerSec * 1000)));
}

export function CompetitiveRoomClient({ roomId }: CompetitiveRoomClientProps) {
  const router = useRouter();
  const [snap, setSnap] = useState<CompetitiveRoomSnapshot | null>(null);
  const [sets, setSets] = useState<string[]>([]);
  const [setsLoading, setSetsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [joinName, setJoinName] = useState("");
  const [needsJoin, setNeedsJoin] = useState(false);
  const [guess, setGuess] = useState("");
  const [busy, setBusy] = useState(false);
  const [asyncFeedback, setAsyncFeedback] = useState<string | null>(null);
  const [linkCopied, setLinkCopied] = useState(false);
  const [copyLinkFailed, setCopyLinkFailed] = useState(false);
  const [timerDraft, setTimerDraft] = useState("");
  const stepStartedAt = useRef<number>(Date.now());

  const loadSets = useCallback(async () => {
    setSetsLoading(true);
    try {
      const res = await competitiveFetch("/sets");
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

  const fetchSnap = useCallback(async () => {
    const res = await competitiveFetch(`/rooms/${roomId}`);
    if (res.status === 403) {
      setNeedsJoin(true);
      setSnap(null);
      return;
    }
    if (!res.ok) {
      const j = (await res.json().catch(() => ({}))) as { error?: string };
      setError(j.error ?? `Request failed (${res.status})`);
      return;
    }
    setNeedsJoin(false);
    setError(null);
    const j = (await res.json()) as CompetitiveRoomSnapshot;
    setSnap(j);
  }, [roomId]);

  useEffect(() => {
    void loadSets();
  }, [loadSets]);

  useEffect(() => {
    void fetchSnap();
  }, [fetchSnap]);

  useEffect(() => {
    if (snap?.state === "ABANDONED") {
      router.replace("/");
    }
  }, [snap?.state, router]);

  useEffect(() => {
    const g = snap?.game;
    const terminalGame =
      g && (g.status === "WON" || g.status === "LOST" || g.status === "CANCELLED");
    const awaitingDismiss = Boolean(terminalGame && snap?.state === "FINISHED");
    const intervalMs = awaitingDismiss ? 3_000 : 2_200;
    const t = window.setInterval(() => void fetchSnap(), intervalMs);
    return () => window.clearInterval(t);
  }, [fetchSnap, snap?.game, snap?.state]);

  useEffect(() => {
    if (snap?.game?.currentStep != null) {
      stepStartedAt.current = Date.now();
    }
  }, [snap?.game?.currentStep, snap?.game?.id]);

  useEffect(() => {
    if (snap?.timerPerStepSeconds != null) {
      setTimerDraft(String(snap.timerPerStepSeconds));
    }
  }, [snap?.timerPerStepSeconds]);

  const historyEntries: HistoryEntry[] = useMemo(() => {
    const guesses = snap?.game?.guesses;
    if (!guesses?.length) return [];
    return [...guesses]
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
      .map((x) => ({
        id: x.id,
        step: x.stepNumber,
        guess: x.guessText.trim() ? x.guessText : "—",
        outcome: x.isCorrect ? ("correct" as const) : ("wrong" as const),
        at: x.createdAt,
        spokenBy: x.speakerDisplayName,
      }));
  }, [snap?.game?.guesses]);

  async function leaveArena() {
    setBusy(true);
    setError(null);
    try {
      const res = await competitiveFetch(`/rooms/${roomId}/leave`, { method: "POST" });
      if (!res.ok) {
        const j = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(j.error ?? "Could not leave");
      }
      router.push("/competitive");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Leave failed");
    } finally {
      setBusy(false);
    }
  }

  async function copyRoomLink() {
    setCopyLinkFailed(false);
    const url = typeof window !== "undefined" ? window.location.href : "";
    try {
      await navigator.clipboard.writeText(url);
      setLinkCopied(true);
      window.setTimeout(() => setLinkCopied(false), 2800);
    } catch {
      setCopyLinkFailed(true);
      window.setTimeout(() => setCopyLinkFailed(false), 5000);
    }
  }

  async function onJoin(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setAsyncFeedback("Crossing the threshold…");
    setError(null);
    try {
      const res = await competitiveFetch(`/rooms/${roomId}/join`, {
        method: "POST",
        body: JSON.stringify({ displayName: joinName }),
      });
      if (!res.ok) {
        const j = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(j.error ?? "Could not join");
      }
      setNeedsJoin(false);
      await fetchSnap();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Join failed");
    } finally {
      setAsyncFeedback(null);
      setBusy(false);
    }
  }

  async function patchSets(next: string[]) {
    setBusy(true);
    try {
      const res = await competitiveFetch(`/rooms/${roomId}/sets`, {
        method: "PATCH",
        body: JSON.stringify({ selectedSets: next }),
      });
      if (!res.ok) {
        const j = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(j.error ?? "Could not save sets");
      }
      await fetchSnap();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Save failed");
    } finally {
      setBusy(false);
    }
  }

  async function toggleSet(name: string) {
    if (!snap) return;
    const cur = new Set(snap.selectedSets);
    if (cur.has(name)) cur.delete(name);
    else cur.add(name);
    await patchSets([...cur]);
  }

  async function applyTimer() {
    if (!snap?.requesterIsHost) return;
    const n = Number.parseInt(timerDraft, 10);
    if (!Number.isFinite(n)) {
      setError("Timer must be a number (seconds).");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const res = await competitiveFetch(`/rooms/${roomId}/timer`, {
        method: "PATCH",
        body: JSON.stringify({ timerPerStepSeconds: n }),
      });
      if (!res.ok) {
        const j = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(j.error ?? "Could not save timer");
      }
      await fetchSnap();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Timer save failed");
    } finally {
      setBusy(false);
    }
  }

  async function onStart() {
    setBusy(true);
    setAsyncFeedback("Raising the veil…");
    try {
      const res = await competitiveFetch(`/rooms/${roomId}/start`, { method: "POST" });
      if (!res.ok) {
        const j = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(j.error ?? "Start failed");
      }
      await fetchSnap();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Start failed");
    } finally {
      setAsyncFeedback(null);
      setBusy(false);
    }
  }

  async function onSubmitGuess() {
    if (!snap?.game) return;
    setBusy(true);
    setAsyncFeedback("Weighing the name in the archive…");
    try {
      const timeTakenMs = Date.now() - stepStartedAt.current;
      const res = await competitiveFetch(`/games/${snap.game.id}/guess`, {
        method: "POST",
        body: JSON.stringify({ guessText: guess, timeTakenMs }),
      });
      if (!res.ok) {
        const j = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(j.error ?? "Guess rejected");
      }
      setGuess("");
      await fetchSnap();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Guess failed");
    } finally {
      setAsyncFeedback(null);
      setBusy(false);
    }
  }

  const g = snap?.game ?? null;
  const isTerminal = Boolean(
    g && (g.status === "WON" || g.status === "LOST" || g.status === "CANCELLED"),
  );
  const timerSec = g?.timerPerStepSeconds ?? snap?.timerPerStepSeconds ?? 90;
  const timerFrac = useStepTimerFraction(
    Boolean(g && g.status === "IN_PROGRESS"),
    g?.competitiveStepDeadlineAt ?? null,
    timerSec,
  );

  const statusPlayers = useMemo(() => {
    if (!snap) return [];
    if (!snap.game) {
      return snap.players.map((p) => ({
        id: p.id,
        displayName: p.displayName,
        hasSubmitted: false,
        isSolved: false,
      }));
    }
    const gm = snap.game;
    const terminalGame =
      gm.status === "WON" || gm.status === "LOST" || gm.status === "CANCELLED";
    return gm.players.map((p) => ({
      id: p.roomPlayerId,
      displayName: p.displayName,
      hasSubmitted: p.submittedThisStep,
      isSolved: p.competitiveState === "SOLVED",
      isEliminated: p.competitiveState === "ELIMINATED",
      finalRank: terminalGame ? p.finalRank : null,
    }));
  }, [snap]);

  const rankedResults = useMemo(() => {
    if (!g || !isTerminal) return [];
    return [...g.players].sort((a, b) => {
      if (a.finalRank == null && b.finalRank == null) return 0;
      if (a.finalRank == null) return 1;
      if (b.finalRank == null) return -1;
      return a.finalRank - b.finalRank;
    });
  }, [g, isTerminal]);

  if (needsJoin) {
    return (
      <div className="mx-auto w-full max-w-md space-y-6 px-0 py-2">
        <Panel variant="textured" className="border-[var(--gold)]/15 p-6">
          <h2 className="font-display text-center text-lg font-semibold tracking-[0.12em] text-[var(--gold-bright)]">
            Join the arena
          </h2>
          <p className="mt-3 text-center text-sm text-[var(--parchment-dim)]">
            Name yourself to cross the threshold. The host may have shared this knot id:
          </p>
          <p className="mt-2 text-center font-mono text-xs text-[var(--mist)]">{roomId}</p>
          <form onSubmit={onJoin} className="mt-6 flex flex-col gap-3">
            <Input
              placeholder="Rival name"
              value={joinName}
              onChange={(e) => setJoinName(e.target.value)}
              autoComplete="off"
            />
            <Button type="submit" disabled={busy || !joinName.trim()}>
              Enter the arena
            </Button>
          </form>
          <PendingRitualNote
            show={busy && Boolean(asyncFeedback)}
            label={asyncFeedback ?? ""}
            className="mt-3 justify-center text-center"
          />
          {error ? <p className="mt-3 text-center text-sm text-[var(--blood)]">{error}</p> : null}
          <p className="mt-6 text-center text-xs text-[var(--mist)]">
            <Link href="/competitive" className="text-[var(--gold-dim)] underline-offset-4 hover:underline">
              ← Back
            </Link>
          </p>
        </Panel>
      </div>
    );
  }

  if (error && !snap) {
    return (
      <Panel variant="textured" className="border-[var(--blood)]/30 p-6 text-center">
        <p className="text-sm text-[var(--parchment-dim)]">{error}</p>
        <Button asChild className="mt-4" variant="outline">
          <Link href="/competitive">Return</Link>
        </Button>
      </Panel>
    );
  }

  if (!snap) {
    return (
      <p className="text-center text-sm text-[var(--parchment-dim)]">Opening the arena…</p>
    );
  }

  const rivalCount = snap.players.length;
  const canStart = rivalCount >= 2;

  return (
    <div className="flex w-full flex-col gap-8">
      {error ? (
        <p className="rounded-lg border border-[var(--blood)]/40 bg-[var(--blood)]/10 px-3 py-2 text-center text-sm text-[var(--gold-bright)]">
          {error}
        </p>
      ) : null}

      {!g ? (
        <Panel variant="textured" className="border-[var(--gold)]/15 p-5 sm:p-7">
          <p className="font-mono text-xs text-[var(--gold-dim)]">
            Knot <span className="text-[var(--mist)]">{snap.id}</span>
          </p>
          <h2 className="font-display mt-4 text-lg font-semibold tracking-[0.1em] text-[var(--parchment)]">
            Before the race
          </h2>
          <p className="mt-2 text-sm text-[var(--parchment-dim)]">
            All rivals see the same veil each step. You get one guess per step; when everyone still racing
            has sealed — or the timer burns out — the round closes. Choose FAB sets (host), set the step timer
            (15–600s), then begin — the rite needs{" "}
            <strong className="text-[var(--parchment)]">at least two rivals</strong>.
          </p>

          <div className="mt-6 rounded-lg border border-[var(--gold)]/12 bg-[var(--void)]/35 px-4 py-4 sm:px-5 sm:py-5">
            <p className="font-display text-[0.6rem] font-semibold uppercase tracking-[0.24em] text-[var(--gold-dim)]">
              Summon rivals
            </p>
            <p className="mt-2 text-sm leading-relaxed text-[var(--parchment-dim)]">
              Share the link so others join from their own scrolls. When enough rivals are present, the host
              may raise the veil.
            </p>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="mt-4 border-[var(--gold)]/35"
              onClick={() => void copyRoomLink()}
            >
              {linkCopied ? "Sealed to your clipboard" : "Copy arena link"}
            </Button>
            {linkCopied ? (
              <p className="mt-2 font-display text-[0.65rem] uppercase tracking-[0.18em] text-[var(--gold-bright)]">
                Copied — send it when the stars align.
              </p>
            ) : null}
            {copyLinkFailed ? (
              <p className="mt-2 text-xs text-[var(--blood)]">
                The rite forbade copying — trace the knot from the address bar with your own hand.
              </p>
            ) : null}
          </div>

          <div className="mt-6">
            <p className="font-display text-[0.65rem] font-semibold uppercase tracking-[0.22em] text-[var(--gold-dim)]">
              Rivals present
            </p>
            <ul className="mt-3 space-y-2">
              {snap.players.map((p) => (
                <li
                  key={p.id}
                  className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-[var(--gold)]/12 bg-[var(--void)]/40 px-3 py-2 text-sm"
                >
                  <span className="text-[var(--parchment)]">
                    {p.displayName}
                    {p.isHost ? (
                      <span className="ml-2 text-[0.65rem] uppercase tracking-wider text-[var(--gold-dim)]">
                        host
                      </span>
                    ) : null}
                    {!p.isConnected ? (
                      <span className="ml-2 text-[0.65rem] text-[var(--blood)]">absent</span>
                    ) : null}
                  </span>
                </li>
              ))}
            </ul>
          </div>

          {snap.requesterIsHost ? (
            <div className="mt-8 flex flex-col gap-2 sm:flex-row sm:items-end">
              <div className="flex-1">
                <p className="font-display text-[0.65rem] font-semibold uppercase tracking-[0.22em] text-[var(--gold-dim)]">
                  Step timer (seconds)
                </p>
                <div className="mt-2 flex gap-2">
                  <Input
                    type="number"
                    min={15}
                    max={600}
                    value={timerDraft}
                    onChange={(e) => setTimerDraft(e.target.value)}
                    className="max-w-[8rem]"
                    disabled={busy}
                  />
                  <Button type="button" variant="outline" size="sm" disabled={busy} onClick={() => void applyTimer()}>
                    Save
                  </Button>
                </div>
                <p className="mt-1 text-[0.7rem] text-[var(--mist)]">15–600 seconds per step.</p>
              </div>
            </div>
          ) : (
            <p className="mt-8 text-sm text-[var(--parchment-dim)]">
              Step timer:{" "}
              <strong className="text-[var(--parchment)]">{snap.timerPerStepSeconds ?? "—"}s</strong> (host
              sets in lobby).
            </p>
          )}

          <div className="mt-8">
            <p className="font-display text-[0.65rem] font-semibold uppercase tracking-[0.22em] text-[var(--gold-dim)]">
              FAB sets (optional)
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              {setsLoading ? (
                <span className="animate-pulse text-sm text-[var(--gold-dim)]" aria-busy="true">
                  Gathering set sigils from the archive…
                </span>
              ) : sets.length === 0 ? (
                <span className="text-sm text-[var(--mist)]">
                  No FAB set codes on published puzzles yet — you can still start from the full FAB pool.
                </span>
              ) : (
                sets.map((name) => {
                  const on = snap.selectedSets.includes(name);
                  return (
                    <button
                      key={name}
                      type="button"
                      disabled={busy || !snap.requesterIsHost}
                      onClick={() => void toggleSet(name)}
                      className={`rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors ${
                        on
                          ? "border-[var(--gold)]/60 bg-[var(--gold)]/15 text-[var(--gold-bright)]"
                          : "border-[var(--wine-deep)] text-[var(--parchment-dim)] hover:border-[var(--gold)]/30"
                      } disabled:opacity-40`}
                    >
                      {name}
                    </button>
                  );
                })
              )}
            </div>
            <p className="mt-2 text-[0.7rem] text-[var(--mist)]">Only the host toggles FAB set filters.</p>
          </div>

          <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
            <Button
              onClick={() => void onStart()}
              disabled={busy || !snap.requesterIsHost || !canStart || setsLoading}
            >
              Begin the race
            </Button>
            <Button type="button" variant="outline" disabled={busy} onClick={() => void leaveArena()}>
              Leave arena
            </Button>
          </div>
          <PendingRitualNote
            show={busy && Boolean(asyncFeedback)}
            label={asyncFeedback ?? ""}
            className="mt-4 justify-center text-center"
          />
          {snap.requesterIsHost && !canStart ? (
            <p className="mt-4 text-center text-xs leading-relaxed text-[var(--gold-dim)]">
              The rite waits: summon one more rival with the link above — two voices are required before the
              veil may rise.
            </p>
          ) : null}
        </Panel>
      ) : null}

      {g && !isTerminal ? (
        <div className="grid w-full max-w-6xl gap-6 pb-32 lg:mx-auto lg:grid-cols-[minmax(0,1fr)_minmax(240px,300px)] lg:items-start lg:gap-10 lg:pb-0">
          <div className="order-1 col-span-full lg:order-1">
            <div className="mb-4 space-y-2">
              <p className="font-display text-center text-[0.65rem] font-semibold uppercase tracking-[0.2em] text-[var(--gold-dim)]">
                Step closes in
              </p>
              <TimerBar fractionRemaining={timerFrac} />
            </div>
            <div className="flex min-w-0 flex-col items-center gap-6">
              <div className="flex w-full max-w-lg flex-col items-stretch gap-6 lg:max-w-none">
                <StepIndicator
                  current={g.currentStep ?? 1}
                  total={g.totalSteps}
                  className="w-full max-w-none"
                />
                <PuzzleViewer
                  imageUrl={g.cardImageUrl}
                  puzzleSeed={g.puzzleSeed}
                  puzzleStep={g.currentStep ?? 1}
                  alt="Veiled card"
                  stepKey={`${g.id}-${g.currentStep ?? 0}`}
                  className="w-full max-w-lg lg:max-w-none"
                />
              </div>
            </div>
          </div>

          <div className="relative z-20 order-2 flex min-w-0 w-full flex-col gap-6 lg:sticky lg:top-28 lg:order-2 lg:self-start">
            <div>
              <p className="font-display text-[0.65rem] font-semibold uppercase tracking-[0.22em] text-[var(--gold-dim)]">
                Rivals
              </p>
              <div className="mt-2">
                <PlayerStatusList players={statusPlayers} />
              </div>
            </div>

            {g.requesterCanSubmit && g.status === "IN_PROGRESS" ? (
              <div className="rounded-xl border-2 border-[var(--gold-bright)]/55 bg-[var(--gold)]/10 px-4 py-3 text-center shadow-[0_0_28px_rgba(212,175,55,0.14)]">
                <p className="font-display text-[0.7rem] font-semibold uppercase tracking-[0.22em] text-[var(--gold-bright)]">
                  Your turn to seal
                </p>
                <p className="mt-1 text-sm text-[var(--parchment)]">
                  One guess this step — choose the exact FaB card name.
                </p>
              </div>
            ) : g.status === "IN_PROGRESS" ? (
              <Panel
                variant="subtle"
                className="border-[var(--gold)]/12 px-4 py-4 text-center text-sm text-[var(--parchment-dim)]"
              >
                <p>
                  You have sealed this step — or are no longer racing. Wait for the round to close or the
                  timer.
                </p>
              </Panel>
            ) : null}

            {g.requesterCanSubmit ? (
              <div className="relative z-30">
                <Panel variant="subtle" className="border-[var(--gold)]/12 p-4 sm:p-5">
                  <GuessCardAutocomplete
                    value={guess}
                    onChange={setGuess}
                    onSubmit={() => void onSubmitGuess()}
                    disabled={busy}
                    placeholder="Exact card name (FaB)…"
                    submitLabel="Seal the guess"
                    asyncFeedback={busy ? asyncFeedback : null}
                  />
                </Panel>
              </div>
            ) : null}

            <GameHistoryPanel entries={historyEntries} />

            <div className="hidden flex-col gap-2 border-t border-[var(--gold)]/10 pt-4 lg:flex">
              <Button type="button" variant="outline" size="sm" disabled={busy} onClick={() => void leaveArena()}>
                Leave arena
              </Button>
            </div>
          </div>

          <div className="order-3 col-span-full flex flex-col gap-2 border-t border-[var(--gold)]/10 pt-4 lg:hidden">
            <Button type="button" variant="outline" size="sm" disabled={busy} onClick={() => void leaveArena()}>
              Leave arena
            </Button>
          </div>
        </div>
      ) : null}

      {g && isTerminal ? (
        <Panel variant="textured" className="border-[var(--gold)]/25 p-6 text-center sm:p-8">
          {g.status === "WON" ? (
            <div className="space-y-2">
              <p className="font-display text-xl font-semibold tracking-[0.12em] text-[var(--gold-bright)] sm:text-2xl">
                The race is run
              </p>
              <p className="text-sm text-[var(--parchment-dim)]">
                Ranked by fewest attempts, then least total time among those who unveiled the card.
              </p>
            </div>
          ) : (
            <p className="font-display text-xl font-semibold tracking-[0.12em] text-[var(--gold-bright)] sm:text-2xl">
              No one unveiled
            </p>
          )}
          <p className="mt-6 text-lg text-[var(--parchment)]">
            <span className="text-[var(--mist)]">Named:</span> {g.cardName}
          </p>
          <p className="mt-1 text-sm text-[var(--parchment-dim)]">
            Set: {g.dataSource}
            {g.fabSet ? ` · FAB: ${g.fabSet}` : ""}
          </p>
          <div className="mt-6">
            <PuzzleViewer
              imageUrl={g.cardImageUrl}
              alt={g.cardName ?? "Card"}
              stepKey="final"
              className="mx-auto max-w-sm"
            />
          </div>

          {rankedResults.length > 0 ? (
            <div className="mx-auto mt-8 max-w-md text-left">
              <p className="font-display text-[0.65rem] font-semibold uppercase tracking-[0.2em] text-[var(--gold-dim)]">
                Standings
              </p>
              <ul className="mt-3 space-y-2">
                {rankedResults.map((p) => (
                  <li
                    key={p.roomPlayerId}
                    className="flex justify-between gap-4 rounded-lg border border-[var(--gold)]/10 bg-[var(--void)]/35 px-3 py-2 text-sm"
                  >
                    <span className="text-[var(--parchment)]">
                      <span className="tabular-nums text-[var(--gold-dim)]">
                        {p.finalRank != null ? `#${p.finalRank}` : "—"}
                      </span>{" "}
                      {p.displayName}
                    </span>
                    <span className="text-[var(--mist)]">
                      {p.competitiveState === "SOLVED" ? (
                        <span className="text-emerald-300/90">Unveiled</span>
                      ) : (
                        <span className="text-[var(--blood)]/90">Out</span>
                      )}
                      <span className="ml-2 tabular-nums">
                        {p.attemptCount} / {(p.totalTimeMs / 1000).toFixed(1)}s
                      </span>
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}

          <div className="mx-auto mt-8 max-w-md text-left">
            <GameHistoryPanel entries={historyEntries} alwaysShowList />
          </div>

          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <Button asChild variant="outline">
              <Link href="/competitive">New arena</Link>
            </Button>
            <Button asChild>
              <Link href="/">Home</Link>
            </Button>
          </div>
        </Panel>
      ) : null}
    </div>
  );
}

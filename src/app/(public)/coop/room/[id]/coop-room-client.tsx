"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { GuessCardAutocomplete } from "@/components/game/GuessCardAutocomplete";
import { PendingRitualNote } from "@/components/game/PendingRitualNote";
import { PuzzleViewer } from "@/components/game/PuzzleViewer";
import { StepIndicator } from "@/components/game/StepIndicator";
import { TurnIndicator } from "@/components/game/TurnIndicator";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Panel } from "@/components/ui/panel";
import { coopFetch } from "@/lib/coop/coop-api";
import { getOrCreateGuestId } from "@/lib/coop/guest-id";
import { PUZZLE_STEP_COUNT } from "@/lib/puzzle/deterministicStep";
import { cn } from "@/lib/utils/cn";

type CoopSnap = {
  id: string;
  state: string;
  selectedSets: string[];
  requesterIsHost: boolean;
  players: Array<{
    id: string;
    displayName: string;
    isHost: boolean;
    turnOrder: number | null;
    isConnected: boolean;
  }>;
  game: null | {
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
    activeTurnRoomPlayerId: string | null;
    activePlayerDisplayName: string | null;
    attemptCount: number;
    guesses: Array<{
      id: string;
      stepNumber: number;
      guessText: string;
      isCorrect: boolean;
      submittedByHostOverride: boolean;
      speakerDisplayName: string;
      createdAt: string;
    }>;
    requesterRoomPlayerId: string;
    requesterIsHost: boolean;
    requesterCanSubmit: boolean;
    requesterCanHostOverride: boolean;
  };
};

export type CoopRoomClientProps = {
  roomId: string;
};

export function CoopRoomClient({ roomId }: CoopRoomClientProps) {
  const [snap, setSnap] = useState<CoopSnap | null>(null);
  const [sets, setSets] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [joinName, setJoinName] = useState("");
  const [needsJoin, setNeedsJoin] = useState(false);
  const [guess, setGuess] = useState("");
  const [busy, setBusy] = useState(false);
  const [asyncFeedback, setAsyncFeedback] = useState<string | null>(null);
  const [linkCopied, setLinkCopied] = useState(false);
  const [copyLinkFailed, setCopyLinkFailed] = useState(false);
  const stepStartedAt = useRef<number>(Date.now());

  const loadSets = useCallback(async () => {
    const res = await coopFetch("/sets");
    if (res.ok) {
      const j = (await res.json()) as { sets: string[] };
      setSets(j.sets ?? []);
    }
  }, []);

  const fetchSnap = useCallback(async () => {
    getOrCreateGuestId();
    const res = await coopFetch(`/rooms/${roomId}`);
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
    const j = (await res.json()) as CoopSnap;
    setSnap(j);
  }, [roomId]);

  useEffect(() => {
    void loadSets();
  }, [loadSets]);

  useEffect(() => {
    void fetchSnap();
  }, [fetchSnap]);

  useEffect(() => {
    const t = window.setInterval(() => void fetchSnap(), 2200);
    return () => window.clearInterval(t);
  }, [fetchSnap]);

  useEffect(() => {
    if (snap?.game?.currentStep != null) {
      stepStartedAt.current = Date.now();
    }
  }, [snap?.game?.currentStep, snap?.game?.id]);

  const orderedPlayers = useMemo(() => {
    if (!snap) return [];
    return [...snap.players].sort((a, b) => {
      const ao = a.turnOrder ?? 999;
      const bo = b.turnOrder ?? 999;
      return ao - bo;
    });
  }, [snap]);

  const seerCount = orderedPlayers.length;
  const canRaiseVeil = seerCount >= 2;

  async function copyCircleLink() {
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
      const res = await coopFetch(`/rooms/${roomId}/join`, {
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
      const res = await coopFetch(`/rooms/${roomId}/sets`, {
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

  async function onStart() {
    setBusy(true);
    setAsyncFeedback("Raising the veil…");
    try {
      const res = await coopFetch(`/rooms/${roomId}/start`, { method: "POST" });
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
      const res = await coopFetch(`/games/${snap.game.id}/guess`, {
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

  async function setPlayerConnection(playerId: string, isConnected: boolean) {
    setBusy(true);
    try {
      const res = await coopFetch(`/rooms/${roomId}/players/${playerId}/connection`, {
        method: "PATCH",
        body: JSON.stringify({ isConnected }),
      });
      if (!res.ok) {
        const j = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(j.error ?? "Update failed");
      }
      await fetchSnap();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Update failed");
    } finally {
      setBusy(false);
    }
  }

  if (needsJoin) {
    return (
      <div className="mx-auto w-full max-w-md space-y-6 px-0 py-2">
        <Panel variant="textured" className="border-[var(--gold)]/15 p-6">
          <h2 className="font-display text-center text-lg font-semibold tracking-[0.12em] text-[var(--gold-bright)]">
            Join the circle
          </h2>
          <p className="mt-3 text-center text-sm text-[var(--parchment-dim)]">
            Name yourself to cross the threshold. The host may have shared this knot id:
          </p>
          <p className="mt-2 text-center font-mono text-xs text-[var(--mist)]">{roomId}</p>
          <form onSubmit={onJoin} className="mt-6 flex flex-col gap-3">
            <Input
              placeholder="Seer name"
              value={joinName}
              onChange={(e) => setJoinName(e.target.value)}
              autoComplete="off"
            />
            <Button type="submit" disabled={busy || !joinName.trim()}>
              Enter the circle
            </Button>
          </form>
          <PendingRitualNote
            show={busy && Boolean(asyncFeedback)}
            label={asyncFeedback ?? ""}
            className="mt-3 justify-center text-center"
          />
          {error ? <p className="mt-3 text-center text-sm text-[var(--blood)]">{error}</p> : null}
          <p className="mt-6 text-center text-xs text-[var(--mist)]">
            <Link href="/coop" className="text-[var(--gold-dim)] underline-offset-4 hover:underline">
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
          <Link href="/coop">Return</Link>
        </Button>
      </Panel>
    );
  }

  if (!snap) {
    return (
      <p className="text-center text-sm text-[var(--parchment-dim)]">Summoning the circle…</p>
    );
  }

  const g = snap.game;
  const isTerminal = g && (g.status === "WON" || g.status === "LOST");

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
            Before the veil
          </h2>
          <p className="mt-2 text-sm text-[var(--parchment-dim)]">
            Speaking order is cast when the host opens the omen. Choose one or more sets (host only),
            then begin — but the veil demands <strong className="text-[var(--parchment)]">at least two seers</strong>{" "}
            at the table.
          </p>

          <div className="mt-6 rounded-lg border border-[var(--gold)]/12 bg-[var(--void)]/35 px-4 py-4 sm:px-5 sm:py-5">
            <p className="font-display text-[0.6rem] font-semibold uppercase tracking-[0.24em] text-[var(--gold-dim)]">
              Bind another soul
            </p>
            <p className="mt-2 text-sm leading-relaxed text-[var(--parchment-dim)]">
              This circle lives at a single <strong className="text-[var(--parchment)]">knot in the weave</strong> —
              share the link so your allies may join in their own scrolls. When enough seers have crossed the
              threshold, the host may raise the veil.
            </p>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="mt-4 border-[var(--gold)]/35"
              onClick={() => void copyCircleLink()}
            >
              {linkCopied ? "Sealed to your clipboard" : "Copy circle link"}
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
              Seers present
            </p>
            <ul className="mt-3 space-y-2">
              {orderedPlayers.map((p) => (
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
                    {snap.game && p.turnOrder != null ? (
                      <span className="ml-2 tabular-nums text-[var(--mist)]">order {p.turnOrder + 1}</span>
                    ) : null}
                  </span>
                </li>
              ))}
            </ul>
          </div>

          <div className="mt-8">
            <p className="font-display text-[0.65rem] font-semibold uppercase tracking-[0.22em] text-[var(--gold-dim)]">
              FAB sets (optional)
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              {sets.length === 0 ? (
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

          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <Button
              onClick={() => void onStart()}
              disabled={busy || !snap.requesterIsHost || !canRaiseVeil}
            >
              Open the veil
            </Button>
            <Button variant="outline" asChild>
              <Link href="/coop">Leave</Link>
            </Button>
          </div>
          <PendingRitualNote
            show={busy && Boolean(asyncFeedback)}
            label={asyncFeedback ?? ""}
            className="mt-4 justify-center text-center"
          />
          {snap.requesterIsHost && !canRaiseVeil ? (
            <p className="mt-4 text-center text-xs leading-relaxed text-[var(--gold-dim)]">
              The rite waits: summon one more seer with the link above — two voices are required before the
              veil may rise.
            </p>
          ) : null}
        </Panel>
      ) : null}

      {g && !isTerminal ? (
        <div className="flex flex-col items-center gap-6">
          <PuzzleViewer
            imageUrl={g.cardImageUrl}
            puzzleSeed={g.puzzleSeed}
            puzzleStep={g.currentStep ?? 1}
            alt="Veiled card"
            stepKey={`${g.id}-${g.currentStep ?? 0}`}
            className="max-w-lg"
          />
          <StepIndicator current={g.currentStep ?? 1} total={PUZZLE_STEP_COUNT} />
          <div className="mx-2 w-full max-w-md sm:mx-4">
            <TurnIndicator activePlayerName={g.activePlayerDisplayName ?? undefined} />
          </div>
          {g.requesterCanHostOverride ? (
            <p className="max-w-md px-2 text-center text-xs text-[var(--gold-dim)] sm:px-4">
              The active seer is marked <strong className="text-[var(--gold-bright)]">absent</strong> — you
              may speak for them as host.
            </p>
          ) : null}
          <Panel variant="subtle" className="w-full max-w-md border-[var(--gold)]/12 px-3 py-4 sm:px-5 sm:py-5">
            <GuessCardAutocomplete
              value={guess}
              onChange={setGuess}
              onSubmit={() => void onSubmitGuess()}
              disabled={!g.requesterCanSubmit || busy}
              placeholder="Exact card name (FaB)…"
              submitLabel={
                g.requesterCanHostOverride ? "Speak for the absent (host)" : "Seal the guess"
              }
              asyncFeedback={busy ? asyncFeedback : null}
            />
          </Panel>
          <GameHistory guesses={g.guesses} />
        </div>
      ) : null}

      {g && isTerminal ? (
        <Panel variant="textured" className="border-[var(--gold)]/25 p-6 text-center sm:p-8">
          {g.status === "WON" ? (
            <div className="rounded-xl border-2 border-emerald-600/45 bg-emerald-950/30 px-4 py-6 shadow-[0_0_48px_rgba(52,211,153,0.18)] sm:px-6 sm:py-8 animate-pulse-win">
              <p className="font-display text-2xl font-semibold leading-snug tracking-[0.12em] text-emerald-100 sm:text-3xl">
                The circle prevailed
              </p>
              <p className="mx-auto mt-3 max-w-md font-display text-[0.7rem] font-semibold uppercase leading-relaxed tracking-[0.22em] text-emerald-200/85 sm:text-xs">
                The true name was spoken — the veil gives way.
              </p>
            </div>
          ) : (
            <p className="font-display text-2xl font-semibold tracking-[0.14em] text-[var(--gold-bright)]">
              The veil closed
            </p>
          )}
          <p className={cn("mt-6 text-lg text-[var(--parchment)]", g.status === "WON" && "mt-8")}>
            <span className="text-[var(--mist)]">Named:</span> {g.cardName}
          </p>
          <p className="mt-1 text-sm text-[var(--parchment-dim)]">
            Set: {g.dataSource}
            {g.fabSet ? ` · FAB: ${g.fabSet}` : ""} · Attempts: {g.attemptCount}
          </p>
          <div className="mt-6">
            <PuzzleViewer
              imageUrl={g.cardImageUrl}
              alt={g.cardName ?? "Card"}
              stepKey="final"
              className="mx-auto max-w-sm"
            />
          </div>
          <GameHistory guesses={g.guesses} className="mt-8 text-left" />
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <Button asChild variant="outline">
              <Link href="/coop">New circle</Link>
            </Button>
            <Button asChild>
              <Link href="/">Home</Link>
            </Button>
          </div>
        </Panel>
      ) : null}

      {g && snap.state === "IN_PROGRESS" ? (
        <HostPlayerTools
          snap={snap}
          onSetConnection={setPlayerConnection}
          busy={busy}
        />
      ) : null}
    </div>
  );
}

function GameHistory({
  guesses,
  className = "",
}: {
  guesses: NonNullable<CoopSnap["game"]>["guesses"];
  className?: string;
}) {
  if (!guesses?.length) return null;
  return (
    <Panel variant="subtle" className={`border-[var(--gold)]/10 p-4 ${className}`}>
      <p className="font-display text-[0.65rem] font-semibold uppercase tracking-[0.2em] text-[var(--gold-dim)]">
        Spoken names
      </p>
      <ul className="mt-3 max-h-48 space-y-2 overflow-y-auto text-sm">
        {guesses.map((x) => (
          <li key={x.id} className="flex flex-wrap justify-between gap-2 text-[var(--parchment-dim)]">
            <span>
              Step {x.stepNumber}: <span className="text-[var(--parchment)]">{x.guessText}</span>
              {x.submittedByHostOverride ? (
                <span className="ml-1 text-[0.65rem] uppercase text-[var(--gold)]">(host)</span>
              ) : null}
            </span>
            <span className={x.isCorrect ? "text-[var(--gold-bright)]" : "text-[var(--mist)]"}>
              {x.isCorrect ? "true" : "false"}
            </span>
          </li>
        ))}
      </ul>
    </Panel>
  );
}

function HostPlayerTools({
  snap,
  onSetConnection,
  busy,
}: {
  snap: CoopSnap;
  onSetConnection: (playerId: string, isConnected: boolean) => void;
  busy: boolean;
}) {
  if (!snap.requesterIsHost) return null;

  return (
    <Panel variant="subtle" className="border-[var(--gold)]/10 p-4">
      <p className="font-display text-[0.65rem] font-semibold uppercase tracking-[0.2em] text-[var(--gold-dim)]">
        Host — absence
      </p>
      <p className="mt-2 text-xs text-[var(--parchment-dim)]">
        If the active seer drops, mark them absent so you may guess on their step.
      </p>
      <ul className="mt-3 space-y-2">
        {snap.players
          .filter((p) => !p.isHost)
          .map((p) => (
            <li key={p.id} className="flex flex-wrap items-center justify-between gap-2 text-sm">
              <span className="text-[var(--parchment)]">
                {p.displayName}
                {!p.isConnected ? (
                  <span className="ml-2 text-[var(--blood)]">absent</span>
                ) : null}
              </span>
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="text-xs"
                  disabled={busy || !p.isConnected}
                  onClick={() => onSetConnection(p.id, false)}
                >
                  Mark absent
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="text-xs"
                  disabled={busy || p.isConnected}
                  onClick={() => onSetConnection(p.id, true)}
                >
                  Mark present
                </Button>
              </div>
            </li>
          ))}
      </ul>
    </Panel>
  );
}

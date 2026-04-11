"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { GameHistoryPanel, type HistoryEntry } from "@/components/game/GameHistoryPanel";
import { GuessCardAutocomplete } from "@/components/game/GuessCardAutocomplete";
import { PendingRitualNote } from "@/components/game/PendingRitualNote";
import { PuzzleViewer } from "@/components/game/PuzzleViewer";
import { StepIndicator } from "@/components/game/StepIndicator";
import { TurnIndicator } from "@/components/game/TurnIndicator";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Panel } from "@/components/ui/panel";
import { useCoopRoomRealtime } from "@/hooks/use-coop-room-realtime";
import { coopFetch } from "@/lib/coop/coop-api";
import { getOrCreateGuestId } from "@/lib/coop/guest-id";
import { PUZZLE_STEP_COUNT } from "@/lib/puzzle/deterministicStep";
import { cn } from "@/lib/utils/cn";
import type { CoopRoomSnapshot } from "@/types/coop-room";

export type CoopRoomClientProps = {
  roomId: string;
};

export function CoopRoomClient({ roomId }: CoopRoomClientProps) {
  const router = useRouter();
  const [guestId] = useState(() => getOrCreateGuestId());
  const [snap, setSnap] = useState<CoopRoomSnapshot | null>(null);
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
  const stepStartedAt = useRef<number>(Date.now());

  const loadSets = useCallback(async () => {
    setSetsLoading(true);
    try {
      const res = await coopFetch("/sets");
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
    const j = (await res.json()) as CoopRoomSnapshot;
    setSnap(j);
  }, [roomId]);

  const applyRealtimeSnap = useCallback((payload: CoopRoomSnapshot) => {
    setSnap(payload);
    setError(null);
    setNeedsJoin(false);
  }, []);

  useCoopRoomRealtime({
    wsUrl: process.env.NEXT_PUBLIC_COOP_WS_URL,
    roomId,
    guestId,
    enabled: !needsJoin,
    onSnapshot: applyRealtimeSnap,
  });

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
    const hasPush =
      typeof process.env.NEXT_PUBLIC_COOP_WS_URL === "string" &&
      process.env.NEXT_PUBLIC_COOP_WS_URL.length > 0;
    const g = snap?.game;
    const terminalGame =
      g &&
      (g.status === "WON" || g.status === "LOST" || g.status === "CANCELLED");
    const awaitingDismiss = Boolean(terminalGame && snap?.state === "FINISHED");
    const intervalMs = awaitingDismiss ? 3_000 : hasPush ? 45_000 : 2_200;
    const t = window.setInterval(() => void fetchSnap(), intervalMs);
    return () => window.clearInterval(t);
  }, [fetchSnap, snap?.game, snap?.state]);

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

  const historyEntries: HistoryEntry[] = useMemo(() => {
    const guesses = snap?.game?.guesses;
    if (!guesses?.length) return [];
    return [...guesses]
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
      .map((x) => ({
        id: x.id,
        step: x.stepNumber,
        guess: x.guessText,
        outcome: x.isCorrect ? ("correct" as const) : ("wrong" as const),
        at: x.createdAt,
        spokenBy: x.submittedByHostOverride
          ? `${x.speakerDisplayName} · host spoke for absent seer`
          : x.speakerDisplayName,
      }));
  }, [snap?.game?.guesses]);

  async function leaveCircle() {
    setBusy(true);
    setError(null);
    try {
      const res = await coopFetch(`/rooms/${roomId}/leave`, { method: "POST" });
      if (!res.ok) {
        const j = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(j.error ?? "Could not leave");
      }
      router.push("/coop");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Leave failed");
    } finally {
      setBusy(false);
    }
  }

  async function hostDismissAfterGameAndNavigate(path: "/" | "/coop") {
    setBusy(true);
    setError(null);
    try {
      const res = await coopFetch(`/rooms/${roomId}/dismiss-after-game`, { method: "POST" });
      if (!res.ok) {
        const j = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(j.error ?? "Could not close the circle");
      }
      router.push(path);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Close failed");
    } finally {
      setBusy(false);
    }
  }

  async function hostEndGame() {
    if (!window.confirm("End the ritual for everyone? The card will be revealed as ended early.")) {
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const res = await coopFetch(`/rooms/${roomId}/end-game`, { method: "POST" });
      if (!res.ok) {
        const j = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(j.error ?? "Could not end game");
      }
      await fetchSnap();
    } catch (err) {
      setError(err instanceof Error ? err.message : "End game failed");
    } finally {
      setBusy(false);
    }
  }

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
  const isTerminal =
    g && (g.status === "WON" || g.status === "LOST" || g.status === "CANCELLED");

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
              {setsLoading ? (
                <span
                  className="text-sm text-[var(--gold-dim)] animate-pulse"
                  aria-busy="true"
                >
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
              disabled={busy || !snap.requesterIsHost || !canRaiseVeil || setsLoading}
            >
              Open the veil
            </Button>
            <Button type="button" variant="outline" disabled={busy} onClick={() => void leaveCircle()}>
              Leave circle
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
        <div className="grid w-full max-w-6xl gap-6 pb-32 lg:mx-auto lg:grid-cols-[minmax(0,1fr)_minmax(240px,300px)] lg:items-start lg:gap-10 lg:pb-0">
          <div className="order-1 col-span-full lg:hidden">
            <TurnIndicator
              activePlayerName={g.activePlayerDisplayName ?? undefined}
              emphasizeActive={g.requesterCanSubmit && g.status === "IN_PROGRESS"}
            />
          </div>

          <div className="order-3 flex min-w-0 flex-col items-center gap-6 lg:order-1">
            <div className="flex w-full max-w-lg flex-col items-stretch gap-6 lg:max-w-none">
              <StepIndicator
                current={g.currentStep ?? 1}
                total={PUZZLE_STEP_COUNT}
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
              <div className="hidden w-full lg:block">
                <TurnIndicator
                  activePlayerName={g.activePlayerDisplayName ?? undefined}
                  emphasizeActive={g.requesterCanSubmit && g.status === "IN_PROGRESS"}
                  className="max-w-none"
                />
              </div>
            </div>
          </div>

          <div className="relative z-20 order-2 flex min-w-0 w-full flex-col gap-6 lg:sticky lg:top-28 lg:order-2 lg:self-start">
            {g.requesterCanSubmit && g.status === "IN_PROGRESS" ? (
              <div className="rounded-xl border-2 border-[var(--gold-bright)]/55 bg-[var(--gold)]/10 px-4 py-3 text-center shadow-[0_0_28px_rgba(212,175,55,0.14)]">
                <p className="font-display text-[0.7rem] font-semibold uppercase tracking-[0.22em] text-[var(--gold-bright)]">
                  Your turn
                </p>
                <p className="mt-1 text-sm text-[var(--parchment)]">
                  Seal the exact FaB card name for this step.
                </p>
              </div>
            ) : null}

            {!g.requesterCanSubmit && g.status === "IN_PROGRESS" ? (
              <Panel variant="subtle" className="border-[var(--gold)]/12 px-4 py-4 text-center text-sm text-[var(--parchment-dim)]">
                <p>
                  <strong className="text-[var(--parchment)]">{g.activePlayerDisplayName ?? "Another seer"}</strong>{" "}
                  holds the voice at this veil. Open the sigil log below to read past guesses — only they may seal a
                  new one
                  {snap.requesterIsHost && g.requesterCanHostOverride
                    ? ", unless you speak for them as host while they are absent."
                    : "."}
                </p>
              </Panel>
            ) : null}

            {g.requesterCanHostOverride ? (
              <p className="text-center text-xs text-[var(--gold-dim)]">
                The active seer is marked <strong className="text-[var(--gold-bright)]">absent</strong> — you
                may speak for them as host.
              </p>
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
                    submitLabel={
                      g.requesterCanHostOverride ? "Speak for the absent (host)" : "Seal the guess"
                    }
                    asyncFeedback={busy ? asyncFeedback : null}
                  />
                </Panel>
              </div>
            ) : null}

            <GameHistoryPanel entries={historyEntries} />

            <CoopInGameLeaveEnd
              busy={busy}
              isHost={snap.requesterIsHost}
              onLeave={() => void leaveCircle()}
              onEndGame={() => void hostEndGame()}
              className="hidden lg:flex"
            />
          </div>

          {snap.state === "IN_PROGRESS" && snap.requesterIsHost ? (
            <div className="order-4 col-span-full lg:col-span-2">
              <HostPlayerTools
                snap={snap}
                onSetConnection={setPlayerConnection}
                busy={busy}
              />
            </div>
          ) : null}

          <CoopInGameLeaveEnd
            busy={busy}
            isHost={snap.requesterIsHost}
            onLeave={() => void leaveCircle()}
            onEndGame={() => void hostEndGame()}
            className="order-5 col-span-full lg:hidden"
          />
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
          ) : g.status === "CANCELLED" ? (
            <div className="space-y-2">
              <p className="font-display text-xl font-semibold tracking-[0.12em] text-[var(--gold-bright)] sm:text-2xl">
                The ritual was closed
              </p>
              <p className="text-sm text-[var(--parchment-dim)]">
                The host ended the game, or too few seers remained at the table.
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
          <div className="mx-auto mt-8 max-w-md text-left">
            <GameHistoryPanel entries={historyEntries} alwaysShowList />
          </div>
          {snap.requesterIsHost ? (
            <p className="mx-auto mt-6 max-w-md text-center text-xs text-[var(--mist)]">
              Leaving through <strong className="text-[var(--parchment-dim)]">Home</strong> or{" "}
              <strong className="text-[var(--parchment-dim)]">New circle</strong> closes this knot for every seer
              still at the table.
            </p>
          ) : null}
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            {snap.requesterIsHost ? (
              <>
                <Button
                  type="button"
                  variant="outline"
                  disabled={busy}
                  onClick={() => void hostDismissAfterGameAndNavigate("/coop")}
                >
                  New circle
                </Button>
                <Button type="button" disabled={busy} onClick={() => void hostDismissAfterGameAndNavigate("/")}>
                  Home
                </Button>
              </>
            ) : (
              <>
                <Button asChild variant="outline">
                  <Link href="/coop">New circle</Link>
                </Button>
                <Button asChild>
                  <Link href="/">Home</Link>
                </Button>
              </>
            )}
          </div>
        </Panel>
      ) : null}

    </div>
  );
}

function CoopInGameLeaveEnd({
  busy,
  isHost,
  onLeave,
  onEndGame,
  className,
}: {
  busy: boolean;
  isHost: boolean;
  onLeave: () => void;
  onEndGame: () => void;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-col gap-2 border-t border-[var(--gold)]/10 pt-4", className)}>
      <Button type="button" variant="outline" size="sm" disabled={busy} onClick={onLeave}>
        Leave circle
      </Button>
      {isHost ? (
        <Button type="button" variant="secondary" size="sm" disabled={busy} onClick={onEndGame}>
          End game for everyone (host)
        </Button>
      ) : null}
    </div>
  );
}

function HostPlayerTools({
  snap,
  onSetConnection,
  busy,
}: {
  snap: CoopRoomSnapshot;
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

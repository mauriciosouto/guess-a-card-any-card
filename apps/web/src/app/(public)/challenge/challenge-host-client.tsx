"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { GuessCardAutocomplete } from "@/components/game/GuessCardAutocomplete";
import { Button } from "@/components/ui/button";
import { Panel } from "@/components/ui/panel";
import { challengeFetch } from "@/lib/challenge/challenge-api";
import { resolveCardIdFromExactName } from "@/lib/single/resolve-card-id";
import type {
  ChallengeOutcome,
  ChallengePublicDto,
  ChallengeResultDto,
  ChallengeStatus,
} from "@/types/challenge";

const HOST_POLL_MS = 4000;
const RESULT_RETRY_DELAYS_MS = [0, 400, 800, 1600];

function playUrl(challengeId: string): string {
  if (typeof window === "undefined") return `/challenge/${challengeId}`;
  return `${window.location.origin}/challenge/${challengeId}`;
}

function outcomeLabel(o: ChallengeOutcome): string {
  switch (o) {
    case "WON":
      return "Won";
    case "LOST":
      return "Lost";
    case "ABANDONED":
      return "Abandoned (yielded)";
    default:
      return o;
  }
}

function formatReadingTime(ms: number): string {
  if (!Number.isFinite(ms) || ms < 0) return "—";
  if (ms < 1000) return `${ms} ms`;
  const s = ms / 1000;
  if (s < 60) return `${s.toFixed(1)} s`;
  const m = Math.floor(s / 60);
  const r = Math.round(s % 60);
  return `${m}m ${r}s`;
}

async function fetchChallengeResultWithRetries(
  challengeId: string,
  signal: { cancelled: boolean },
): Promise<ChallengeResultDto | null> {
  for (const delayMs of RESULT_RETRY_DELAYS_MS) {
    if (delayMs > 0) {
      await new Promise((r) => setTimeout(r, delayMs));
    }
    if (signal.cancelled) return null;
    const res = await challengeFetch(`/${challengeId}/result`);
    if (signal.cancelled) return null;
    if (res.status === 409) {
      continue;
    }
    if (res.ok) {
      return (await res.json()) as ChallengeResultDto;
    }
  }
  return null;
}

export function ChallengeHostClient() {
  const [pickText, setPickText] = useState("");
  const [busy, setBusy] = useState(false);
  const [cancelBusy, setCancelBusy] = useState(false);
  const [cancelConfirmOpen, setCancelConfirmOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [challengeId, setChallengeId] = useState<string | null>(null);
  const [status, setStatus] = useState<ChallengeStatus | null>(null);
  const [publicDto, setPublicDto] = useState<ChallengePublicDto | null>(null);
  const [linkCopied, setLinkCopied] = useState(false);
  const [result, setResult] = useState<ChallengeResultDto | null>(null);
  const [historyFailed, setHistoryFailed] = useState(false);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyRetryToken, setHistoryRetryToken] = useState(0);

  const pollIntervalRef = useRef<number | null>(null);

  const url = challengeId ? playUrl(challengeId) : "";

  const pollPublic = useCallback(async () => {
    if (!challengeId) return;
    const pub = await challengeFetch(`/${challengeId}`);
    if (pub.ok) {
      const j = (await pub.json()) as ChallengePublicDto;
      setStatus(j.status);
      setPublicDto(j);
      if (
        (j.status === "COMPLETED" || j.status === "CANCELLED") &&
        pollIntervalRef.current != null
      ) {
        window.clearInterval(pollIntervalRef.current);
        pollIntervalRef.current = null;
      }
    }
  }, [challengeId]);

  useEffect(() => {
    if (!challengeId) return;
    let cancelled = false;

    if (pollIntervalRef.current != null) {
      window.clearInterval(pollIntervalRef.current);
      pollIntervalRef.current = null;
    }

    const tick = async () => {
      await pollPublic();
      if (cancelled) return;
    };

    void tick();
    pollIntervalRef.current = window.setInterval(() => void tick(), HOST_POLL_MS);

    return () => {
      cancelled = true;
      if (pollIntervalRef.current != null) {
        window.clearInterval(pollIntervalRef.current);
        pollIntervalRef.current = null;
      }
    };
  }, [challengeId, pollPublic]);

  useEffect(() => {
    if (!challengeId || publicDto?.status !== "COMPLETED") {
      return;
    }

    const signal = { cancelled: false };
    setHistoryLoading(true);
    setHistoryFailed(false);

    void (async () => {
      const dto = await fetchChallengeResultWithRetries(challengeId, signal);
      if (signal.cancelled) return;
      if (dto) {
        setResult(dto);
        setHistoryFailed(false);
      } else {
        setHistoryFailed(true);
      }
      setHistoryLoading(false);
    })();

    return () => {
      signal.cancelled = true;
      setHistoryLoading(false);
    };
  }, [challengeId, publicDto?.status, historyRetryToken]);

  function resetHostFlow() {
    setChallengeId(null);
    setStatus(null);
    setPublicDto(null);
    setResult(null);
    setHistoryFailed(false);
    setHistoryLoading(false);
    setPickText("");
    setError(null);
    setCancelConfirmOpen(false);
  }

  async function cancelPendingChallenge() {
    if (!challengeId) return;
    setError(null);
    setCancelBusy(true);
    try {
      const res = await challengeFetch(`/${challengeId}/cancel`, { method: "POST" });
      if (!res.ok) {
        const j = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(j.error ?? `Could not cancel (${res.status})`);
      }
      resetHostFlow();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not cancel");
    } finally {
      setCancelBusy(false);
    }
  }

  async function createChallenge() {
    setError(null);
    setBusy(true);
    try {
      const cardId = await resolveCardIdFromExactName(pickText);
      if (!cardId) {
        setError(
          "Choose a name from the suggestions, or type the full exact card name as it appears in the catalog.",
        );
        return;
      }
      const res = await challengeFetch("/", {
        method: "POST",
        body: JSON.stringify({ cardId }),
      });
      if (!res.ok) {
        const j = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(j.error ?? "Could not create challenge");
      }
      const j = (await res.json()) as { challengeId: string };
      setPublicDto(null);
      setResult(null);
      setHistoryFailed(false);
      setHistoryLoading(false);
      setChallengeId(j.challengeId);
      setStatus("PENDING");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed");
    } finally {
      setBusy(false);
    }
  }

  async function copyLink() {
    if (!url) return;
    try {
      await navigator.clipboard.writeText(url);
      setLinkCopied(true);
      window.setTimeout(() => setLinkCopied(false), 2500);
    } catch {
      setError("Could not copy automatically — select and copy the URL from the box above.");
    }
  }

  function openPlayTab() {
    if (!url) return;
    window.open(url, "_blank", "noopener,noreferrer");
  }

  function retryHistory() {
    setResult(null);
    setHistoryFailed(false);
    setHistoryRetryToken((n) => n + 1);
  }

  function hostWaitingMessage(): string | null {
    if (status === "PENDING") {
      return "Share the play link. No one has begun the reading yet.";
    }
    if (status === "IN_PROGRESS") {
      return "The challenged player is in the reading. Final results will appear here when they finish.";
    }
    return null;
  }

  const waitingMsg = hostWaitingMessage();
  const completedSummary =
    publicDto?.status === "COMPLETED"
      ? {
          outcome: publicDto.outcome,
          attemptsUsed: publicDto.attemptsUsed,
          timeMs: publicDto.timeMs,
        }
      : null;

  return (
    <div className="space-y-8">
      {error ? (
        <p className="rounded-lg border border-[var(--blood)]/35 bg-[var(--blood)]/10 px-3 py-2 text-center text-sm text-[var(--gold-bright)]">
          {error}
        </p>
      ) : null}

      {!challengeId ? (
        <Panel variant="textured" className="border-[var(--gold)]/15 p-5 sm:p-6">
          <p className="text-sm leading-relaxed text-[var(--parchment-dim)]">
            Search the archive, pick the card the other player must name, then share one link. They get the
            same step-by-step veil as solitary reading — one attempt per step, one run only.
          </p>
          <p className="mt-4 font-display text-[0.65rem] font-semibold uppercase tracking-[0.22em] text-[var(--gold-dim)]">
            Card
          </p>
          <div className="mt-3">
            <GuessCardAutocomplete
              value={pickText}
              onChange={setPickText}
              onSubmit={() => void createChallenge()}
              disabled={busy}
              placeholder="Type at least 3 letters, then pick from suggestions…"
              submitLabel="Create challenge"
              asyncFeedback={busy ? "Creating challenge…" : null}
            />
          </div>
          <p className="mt-3 text-[0.7rem] text-[var(--mist)]">
            The name must match a suggestion (or the exact catalog spelling) so we can bind one printing.
          </p>
        </Panel>
      ) : null}

      {challengeId ? (
        <Panel variant="textured" className="border-[var(--gold)]/20 p-5 sm:p-6">
          <p className="font-display text-[0.62rem] font-semibold uppercase tracking-[0.32em] text-[var(--gold-dim)]">
            Your challenge
          </p>
          <p className="mt-3 text-sm leading-relaxed text-[var(--parchment-dim)]">
            Send the reading link to the other player — copy it or open it in a new tab.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Button type="button" variant="outline" size="sm" onClick={() => void copyLink()}>
              {linkCopied ? "Copied" : "Copy link"}
            </Button>
            <Button type="button" size="sm" onClick={openPlayTab}>
              Open as player (new tab)
            </Button>
          </div>
          <p className="mt-3 text-[0.7rem] leading-relaxed text-[var(--mist)]">
            Same device? Use the button so a fresh tab gets its own guest session — otherwise the host and
            player would share one identity.
          </p>

          {status === "PENDING" ? (
            <div className="mt-6 border-t border-[var(--gold)]/12 pt-6">
              {cancelConfirmOpen ? (
                <div className="rounded-lg border border-[var(--blood)]/30 bg-[var(--blood)]/08 px-4 py-4">
                  <p className="text-sm leading-relaxed text-[var(--parchment-dim)]">
                    Cancel this challenge? The play link will stop working and nobody will be able to begin
                    the reading.
                  </p>
                  <div className="mt-4 flex flex-wrap gap-3">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      disabled={cancelBusy}
                      onClick={() => setCancelConfirmOpen(false)}
                    >
                      Keep challenge
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      className="border-[var(--blood)]/40 bg-[var(--blood)]/15 text-[var(--gold-bright)] hover:bg-[var(--blood)]/25"
                      disabled={cancelBusy}
                      onClick={() => void cancelPendingChallenge()}
                    >
                      {cancelBusy ? "Cancelling…" : "Yes, cancel challenge"}
                    </Button>
                  </div>
                </div>
              ) : (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="text-[var(--mist)] hover:bg-[var(--blood)]/10 hover:text-[var(--gold-bright)]"
                  onClick={() => setCancelConfirmOpen(true)}
                >
                  Cancel this challenge
                </Button>
              )}
            </div>
          ) : null}
        </Panel>
      ) : null}

      {challengeId ? (
        <Panel variant="textured" className="border-[var(--gold)]/15 p-5 sm:p-6">
          <p className="font-display text-[0.62rem] font-semibold uppercase tracking-[0.32em] text-[var(--gold-dim)]">
            Result{status !== "COMPLETED" ? " (updates while in progress)" : ""}
          </p>
          {waitingMsg ? (
            <p className="mt-3 text-sm leading-relaxed text-[var(--parchment-dim)]">{waitingMsg}</p>
          ) : null}

          {completedSummary ? (
            <div className="mt-4 space-y-4">
              <p className="text-sm text-[var(--parchment)]">
                Outcome:{" "}
                <strong className="text-[var(--gold-bright)]">
                  {completedSummary.outcome != null
                    ? outcomeLabel(completedSummary.outcome)
                    : "—"}
                </strong>
              </p>
              <p className="tabular-nums text-sm text-[var(--parchment-dim)]">
                Attempts:{" "}
                <span className="text-[var(--parchment)]">
                  {completedSummary.attemptsUsed ?? "—"}
                </span>
                {" · "}
                Time on guesses:{" "}
                <span className="text-[var(--parchment)]">
                  {formatReadingTime(completedSummary.timeMs ?? NaN)}
                </span>
              </p>
              {result ? (
                <>
                  <p className="text-sm text-[var(--parchment-dim)]">
                    Card: <span className="text-[var(--parchment)]">{result.cardName}</span>
                  </p>
                  {result.finalGuess ? (
                    <p className="tabular-nums text-sm text-[var(--parchment-dim)]">
                      Last guess:{" "}
                      <span className="text-[var(--parchment)]">{result.finalGuess}</span>
                    </p>
                  ) : null}
                  <div>
                    <p className="font-display text-[0.65rem] font-semibold uppercase tracking-[0.2em] text-[var(--gold-dim)]">
                      Guess history
                    </p>
                    <ul className="mt-2 space-y-2">
                      {result.guesses.map((g) => (
                        <li
                          key={g.id}
                          className="rounded border border-[var(--gold)]/10 bg-[var(--void)]/35 px-3 py-2 text-sm"
                        >
                          <span className="text-[var(--mist)]">Step {g.stepNumber}</span> — {g.guessText}{" "}
                          <span className={g.isCorrect ? "text-emerald-400" : "text-[var(--blood)]"}>
                            ({g.isCorrect ? "correct" : "wrong"})
                          </span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </>
              ) : historyLoading ? (
                <p className="text-sm text-[var(--parchment-dim)]">Loading guess history…</p>
              ) : historyFailed ? (
                <div className="mt-2 space-y-3">
                  <p className="text-sm text-[var(--parchment-dim)]">
                    Guess history could not be loaded. Refresh the page, or try again.
                  </p>
                  <Button type="button" variant="outline" size="sm" onClick={() => retryHistory()}>
                    Try again
                  </Button>
                </div>
              ) : null}
            </div>
          ) : null}
        </Panel>
      ) : null}

      <div className="flex flex-wrap gap-3">
        <Button variant="outline" asChild>
          <Link href="/">Home</Link>
        </Button>
        {challengeId ? (
          <Button type="button" variant="outline" onClick={() => resetHostFlow()}>
            Create another
          </Button>
        ) : null}
      </div>
    </div>
  );
}

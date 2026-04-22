"use client";

import Link from "next/link";
import { useCallback, useEffect, useLayoutEffect, useState } from "react";
import { SinglePlayerClient } from "@/app/(public)/single/single-player-client";
import { Button } from "@/components/ui/button";
import { Panel } from "@/components/ui/panel";
import { challengeFetch } from "@/lib/challenge/challenge-api";
import type { ChallengePublicDto, ChallengeStatus } from "@/types/challenge";

function storageKey(challengeId: string): string {
  return `gac-challenge-game:${challengeId}`;
}

const PUBLIC_POLL_MS = 6000;

export function ChallengePlayClient({ challengeId }: { challengeId: string }) {
  const [status, setStatus] = useState<ChallengeStatus | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [startError, setStartError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [gameId, setGameId] = useState<string | null>(null);
  const [storageReady, setStorageReady] = useState(false);

  const fetchPublic = useCallback(async () => {
    const res = await challengeFetch(`/${challengeId}`);
    if (!res.ok) {
      const j = (await res.json().catch(() => ({}))) as { error?: string };
      setLoadError(j.error ?? `Request failed (${res.status})`);
      return;
    }
    setLoadError(null);
    const j = (await res.json()) as ChallengePublicDto;
    setStatus(j.status);
  }, [challengeId]);

  useLayoutEffect(() => {
    try {
      const stored = sessionStorage.getItem(storageKey(challengeId));
      setGameId(stored);
    } catch {
      setGameId(null);
    }
    setStorageReady(true);
  }, [challengeId]);

  useEffect(() => {
    if (!storageReady) return;
    if (gameId) return;
    if (status === "CANCELLED" || status === "COMPLETED") return;
    void fetchPublic();
    const t = window.setInterval(() => void fetchPublic(), PUBLIC_POLL_MS);
    return () => window.clearInterval(t);
  }, [storageReady, gameId, status, fetchPublic]);

  async function start() {
    setStartError(null);
    setBusy(true);
    try {
      const res = await challengeFetch(`/${challengeId}/start`, { method: "POST" });
      if (!res.ok) {
        const j = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(j.error ?? `Start failed (${res.status})`);
      }
      const j = (await res.json()) as { gameId: string };
      sessionStorage.setItem(storageKey(challengeId), j.gameId);
      setGameId(j.gameId);
      void fetchPublic();
    } catch (e) {
      setStartError(e instanceof Error ? e.message : "Start failed");
    } finally {
      setBusy(false);
    }
  }

  if (loadError) {
    return (
      <Panel variant="textured" className="border-[var(--blood)]/25 p-6 text-center">
        <p className="text-sm text-[var(--gold-bright)]">{loadError}</p>
        <Button className="mt-4" variant="outline" asChild>
          <Link href="/">Home</Link>
        </Button>
      </Panel>
    );
  }

  if (gameId) {
    return (
      <SinglePlayerClient
        initialGameId={gameId}
        doneActions={
          <>
            <Button variant="outline" asChild>
              <Link href="/">Home</Link>
            </Button>
          </>
        }
      />
    );
  }

  if (status === "COMPLETED" && !gameId) {
    return (
      <Panel variant="textured" className="border-[var(--gold)]/15 p-6 text-center">
        <p className="text-sm leading-relaxed text-[var(--parchment-dim)]">
          This challenge is already over. If you finished on this browser, your tab may have lost the
          saved session — ask the host for the result, or use a new challenge link.
        </p>
        <Button className="mt-4" variant="outline" asChild>
          <Link href="/">Home</Link>
        </Button>
      </Panel>
    );
  }

  if (status === "CANCELLED") {
    return (
      <Panel variant="textured" className="border-[var(--gold)]/15 p-6 text-center">
        <p className="font-display text-[0.65rem] font-semibold uppercase tracking-[0.28em] text-[var(--gold-dim)]">
          Challenge withdrawn
        </p>
        <p className="mt-4 text-sm leading-relaxed text-[var(--parchment-dim)]">
          The host cancelled this challenge before it began. Ask them for a new link if you still want to
          play.
        </p>
        <Button className="mt-6" variant="outline" asChild>
          <Link href="/">Home</Link>
        </Button>
      </Panel>
    );
  }

  if (status === "PENDING") {
    return (
      <div className="space-y-6">
        {startError ? (
          <p className="rounded-lg border border-[var(--blood)]/35 bg-[var(--blood)]/10 px-3 py-2 text-center text-sm text-[var(--gold-bright)]">
            {startError}
          </p>
        ) : null}
        <Panel variant="textured" className="border-[var(--gold)]/15 p-6 text-center sm:p-8">
          <p className="font-display text-[0.65rem] font-semibold uppercase tracking-[0.28em] text-[var(--gold-dim)]">
            You’ve been challenged
          </p>
          <p className="mt-4 text-sm leading-relaxed text-[var(--parchment-dim)]">
            The host locked one card in the archive. You get a single run: same veil and guesses as
            solitary reading — one seal per step. When you’re ready, begin (this can only be done once per
            link).
          </p>
          <Button className="mt-8" onClick={() => void start()} disabled={busy}>
            {busy ? "Starting…" : "Begin reading"}
          </Button>
          <div className="mt-6">
            <Button variant="outline" asChild>
              <Link href="/">Home</Link>
            </Button>
          </div>
        </Panel>
      </div>
    );
  }

  if (status === "IN_PROGRESS") {
    return (
      <Panel variant="textured" className="border-[var(--gold)]/15 p-6 text-center">
        <p className="text-sm leading-relaxed text-[var(--parchment-dim)]">
          This link is already in a reading. To continue, open this same URL again in the{" "}
          <strong className="text-[var(--parchment)]">same browser profile</strong> on the{" "}
          <strong className="text-[var(--parchment)]">same device</strong> where you tapped{" "}
          <strong className="text-[var(--parchment)]">Begin reading</strong> — your run is stored only there.
          If you cannot, ask the host for a <strong className="text-[var(--parchment)]">new challenge link</strong>.
        </p>
        <Button className="mt-4" variant="outline" asChild>
          <Link href="/">Home</Link>
        </Button>
      </Panel>
    );
  }

  return (
    <p className="text-center text-sm text-[var(--parchment-dim)]">Checking challenge…</p>
  );
}

"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { getOrCreateGuestId } from "@/lib/coop/guest-id";
import { scheduleCardArtPreload } from "@/lib/single/preload-card-art";
import {
  forfeitSingleGame,
  loadSingleGameSnapshot,
  startSingleGameSession,
  submitSingleGuess,
} from "@/lib/single/single-game-remote";
import { singleFetch } from "@/lib/single/single-api";
import type { SingleGameSnapshot } from "@/types/single-game";

export type SinglePlayerPhase = "setup" | "play" | "done";

export type UseSinglePlayerSessionOptions = {
  /** When set, skips setup and loads this game (challenge / resume). */
  initialGameId?: string | null;
  /** Body text for the yield/forfeit confirmation modal (e.g. challenge copy). */
  forfeitConfirmMessage?: string;
};

export function useSinglePlayerFabSets() {
  const [sets, setSets] = useState<string[]>([]);
  const [setsLoading, setSetsLoading] = useState(true);

  const loadSets = useCallback(async () => {
    setSetsLoading(true);
    try {
      getOrCreateGuestId();
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

  useEffect(() => {
    void loadSets();
  }, [loadSets]);

  return { sets, setsLoading, reloadFabSets: loadSets };
}

const DEFAULT_FORFEIT_CONFIRM =
  "End this reading? The true card will be revealed and this run counts as lost.";

export function useSinglePlayerSession(options?: UseSinglePlayerSessionOptions) {
  const bootId = options?.initialGameId ?? null;
  const forfeitConfirm = options?.forfeitConfirmMessage ?? DEFAULT_FORFEIT_CONFIRM;
  const [phase, setPhase] = useState<SinglePlayerPhase>(() =>
    bootId ? "play" : "setup",
  );
  const [gameId, setGameId] = useState<string | null>(() => bootId);
  const [game, setGame] = useState<SingleGameSnapshot | null>(null);
  const [guess, setGuess] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [asyncFeedback, setAsyncFeedback] = useState<string | null>(null);
  const [forfeitModalOpen, setForfeitModalOpen] = useState(false);
  const stepStartedAt = useRef(Date.now());

  const applySnapshot = useCallback((snap: SingleGameSnapshot) => {
    setGame(snap);
    const terminal =
      snap.status === "WON" ||
      snap.status === "LOST" ||
      snap.status === "CANCELLED";
    if (terminal) setPhase("done");
    else setPhase("play");
  }, []);

  const loadGame = useCallback(
    async (id: string) => {
      try {
        const snap = await loadSingleGameSnapshot(id);
        applySnapshot(snap);
        setError(null);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Could not load game");
      }
    },
    [applySnapshot],
  );

  useEffect(() => {
    if (game?.currentStep != null) stepStartedAt.current = Date.now();
  }, [game?.currentStep, game?.id]);

  useEffect(() => {
    if (!game || game.status !== "IN_PROGRESS") return;
    scheduleCardArtPreload(game.cardImageUrl);
  }, [game]);

  useEffect(() => {
    if (!gameId || phase !== "play") return;
    const onVis = () => {
      if (document.visibilityState === "visible") void loadGame(gameId);
    };
    document.addEventListener("visibilitychange", onVis);
    return () => document.removeEventListener("visibilitychange", onVis);
  }, [gameId, phase, loadGame]);

  useEffect(() => {
    const id = options?.initialGameId;
    if (!id) return;
    setGameId(id);
    setPhase("play");
    setError(null);
    void loadGame(id);
  }, [options?.initialGameId, loadGame]);

  const start = useCallback(
    async (selectedFabSets: string[]) => {
      setBusy(true);
      setAsyncFeedback("Drawing a veil from the archive…");
      setError(null);
      try {
        const { gameId: id, game: snap } = await startSingleGameSession(selectedFabSets);
        setGameId(id);
        applySnapshot(snap);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Failed");
      } finally {
        setAsyncFeedback(null);
        setBusy(false);
      }
    },
    [applySnapshot],
  );

  const submitGuess = useCallback(async () => {
    if (!gameId) return;
    setBusy(true);
    setAsyncFeedback("Sealing your guess — the archive listens…");
    setError(null);
    const text = guess;
    try {
      const timeTakenMs = Date.now() - stepStartedAt.current;
      const snap = await submitSingleGuess(gameId, text, timeTakenMs);
      setGuess("");
      applySnapshot(snap);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Guess failed");
    } finally {
      setAsyncFeedback(null);
      setBusy(false);
    }
  }, [gameId, guess, applySnapshot]);

  const requestForfeit = useCallback(() => {
    if (!gameId || game?.status !== "IN_PROGRESS") return;
    setForfeitModalOpen(true);
  }, [gameId, game?.status]);

  const dismissForfeit = useCallback(() => {
    setForfeitModalOpen(false);
  }, []);

  const commitForfeit = useCallback(async () => {
    if (!gameId || game?.status !== "IN_PROGRESS") return;
    setForfeitModalOpen(false);
    setBusy(true);
    setAsyncFeedback("Closing the veil…");
    setError(null);
    try {
      const snap = await forfeitSingleGame(gameId);
      applySnapshot(snap);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not end game");
    } finally {
      setAsyncFeedback(null);
      setBusy(false);
    }
  }, [gameId, game?.status, applySnapshot]);

  const reset = useCallback(() => {
    setPhase("setup");
    setGameId(null);
    setGame(null);
    setGuess("");
    setError(null);
    setAsyncFeedback(null);
    setForfeitModalOpen(false);
  }, []);

  return {
    phase,
    gameId,
    game,
    guess,
    setGuess,
    error,
    busy,
    asyncFeedback,
    start,
    submitGuess,
    forfeitModalOpen,
    forfeitMessage: forfeitConfirm,
    requestForfeit,
    dismissForfeit,
    commitForfeit,
    reset,
  };
}

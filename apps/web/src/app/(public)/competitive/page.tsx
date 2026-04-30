"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useState } from "react";
import { RouteShell } from "@/components/layout/route-shell";
import { ModeHowToPanel } from "@/components/onboarding/mode-how-to-panel";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Panel } from "@/components/ui/panel";
import { competitiveFetch } from "@/lib/competitive/competitive-api";
import { getOrCreateGuestId } from "@/lib/coop/guest-id";

const COMPETITIVE_HOW_IT_WORKS = [
  "1. Join a competitive room - Enter a match with other players ready to compete.",
  "2. Everyone gets the same card - All players see the same hidden card and the same reveal steps.",
  "3. Clues reveal step by step - Each step uncovers more information for everyone at the same time.",
  "4. Guess as soon as you are ready - You do not have to wait, submit your guess whenever you feel confident.",
  "5. First correct guess wins - The first player to correctly identify the card wins the match.",
  "6. The round ends for everyone - Winner is declared, card is revealed, and the round ends.",
] as const;

const COMPETITIVE_RULES = [
  "Players act independently, guesses are not shared.",
  "You can guess earlier than others.",
  "Speed matters, but wrong guesses still count.",
  "If no one guesses correctly, the round ends as a loss for everyone.",
] as const;

const COMPETITIVE_TIPS = [
  "Recognizing early clues is key to winning.",
  "Do not wait too long, someone else might solve it first.",
  "Balance speed and accuracy, rushed guesses can cost you.",
  "Learn common card patterns to react faster.",
] as const;

export default function CompetitiveLobbyPage() {
  const router = useRouter();
  const [displayName, setDisplayName] = useState("");
  const [joinId, setJoinId] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const goRoom = useCallback(
    (id: string) => {
      router.push(`/competitive/room/${id.trim()}`);
    },
    [router],
  );

  async function createArena(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    getOrCreateGuestId();
    try {
      const res = await competitiveFetch("/rooms", {
        method: "POST",
        body: JSON.stringify({ displayName }),
      });
      if (!res.ok) {
        const j = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(j.error ?? "Could not open arena");
      }
      const j = (await res.json()) as { roomId: string };
      goRoom(j.roomId);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed");
    } finally {
      setBusy(false);
    }
  }

  function joinArena(e: React.FormEvent) {
    e.preventDefault();
    if (!joinId.trim()) return;
    goRoom(joinId);
  }

  return (
    <RouteShell
      title="Rival auguries"
      description="Every soul beholds the same veil. When all racing rivals have sealed a guess — or the hourglass empties — the next truth is shown. Fewest attempts wins; ties break on least total time."
      className="max-w-3xl"
    >
      <ModeHowToPanel
        summaryLabel="How Competitive works"
        title="Race to Solve (Competitive)"
        intro="Compete against other players to guess the card first. Speed and accuracy matter — the fastest correct answer wins."
        howItWorks={COMPETITIVE_HOW_IT_WORKS}
        trackedStats={COMPETITIVE_RULES}
        middleSectionTitle="Important rules"
        tips={COMPETITIVE_TIPS}
      />

      <div id="competitive-room-controls" className="mt-6 grid gap-6 sm:grid-cols-2">
        <Panel variant="textured" className="border-[var(--gold)]/15 p-5">
          <h2 className="font-display text-sm font-semibold uppercase tracking-[0.18em] text-[var(--gold-bright)]">
            Open an arena
          </h2>
          <form onSubmit={createArena} className="mt-4 flex flex-col gap-3">
            <Input
              placeholder="Your name (host)"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              autoComplete="off"
            />
            <Button type="submit" disabled={busy || !displayName.trim()}>
              Create room
            </Button>
          </form>
        </Panel>
        <Panel variant="textured" className="border-[var(--gold)]/15 p-5">
          <h2 className="font-display text-sm font-semibold uppercase tracking-[0.18em] text-[var(--gold-bright)]">
            Join an arena
          </h2>
          <form onSubmit={joinArena} className="mt-4 flex flex-col gap-3">
            <Input
              placeholder="Paste room id (UUID)"
              value={joinId}
              onChange={(e) => setJoinId(e.target.value)}
              autoComplete="off"
            />
            <Button type="submit" variant="outline" disabled={!joinId.trim()}>
              Go to room
            </Button>
          </form>
        </Panel>
      </div>
      {error ? (
        <p className="mt-4 rounded-lg border border-[var(--blood)]/35 bg-[var(--blood)]/10 px-3 py-2 text-center text-sm text-[var(--gold-bright)]">
          {error}
        </p>
      ) : null}
      <p className="mt-8 text-center text-xs text-[var(--mist)]">
        <Link href="/" className="text-[var(--gold-dim)] underline-offset-4 hover:underline">
          ← Home
        </Link>
      </p>
    </RouteShell>
  );
}

"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { fetchLeaderboard } from "@/lib/leaderboard/leaderboard-api";
import type {
  LeaderboardEntry,
  LeaderboardMetric,
  LeaderboardMode,
} from "@/lib/leaderboard/types";
import { RouteShell } from "@/components/layout/route-shell";
import { EmptyStateWell } from "@/components/ui/empty-state";
import { cn } from "@/lib/utils/cn";

const MODES: { value: LeaderboardMode; label: string }[] = [
  { value: "ALL", label: "All" },
  { value: "SINGLE", label: "Single" },
  { value: "CHALLENGE", label: "Challenge" },
  { value: "COOP", label: "Co-op" },
  { value: "COMPETITIVE", label: "Competitive" },
];

function formatWinRate(fraction: number): string {
  if (!Number.isFinite(fraction)) return "—";
  return `${Math.round(fraction * 1000) / 10}%`;
}

function formatLastPlayed(iso: string | null): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function leaderboardEmptyCopy(
  metric: LeaderboardMetric,
  mode: LeaderboardMode,
): { title: string; description: string } {
  const modeLabel = MODES.find((m) => m.value === mode)?.label ?? mode;

  if (metric === "winRate") {
    return {
      title: "The win-rate list is open",
      description:
        mode === "ALL"
          ? "No one is ranked for win rate in All modes yet — readers need at least ten completed games in that scope, and the board stays empty until someone qualifies. Try Wins, another mode, or play more to join the list yourself."
          : `No one has 10+ games in ${modeLabel} to rank by win rate yet. Switch to a broader scope, try the Wins table, or close out more runs in this mode.`,
    };
  }
  return {
    title: "The hall of names is quiet",
    description:
      mode === "ALL"
        ? "No one has a recorded place on the list yet. When registered players complete games, their tallies show up here. Be among the first — finish a run while signed in."
        : `No players have a counted streak in ${modeLabel} yet. Pick another mode, try “All” for lifetime ranks, or seal a run in that mode to help fill the list.`,
  };
}

function selectClassName() {
  return cn(
    "w-full min-w-0 max-w-full rounded-md border border-[var(--gold)]/25 bg-[var(--void-deep)]/60 px-3 py-2",
    "text-sm text-[var(--parchment)]",
    "focus:border-[var(--gold)]/50 focus:outline-none focus:ring-1 focus:ring-[var(--gold)]/30",
  );
}

function LeaderboardEmptyState({
  metric,
  mode,
}: {
  metric: LeaderboardMetric;
  mode: LeaderboardMode;
}) {
  const { title, description } = leaderboardEmptyCopy(metric, mode);
  return (
    <EmptyStateWell title={title} description={description}>
      <Link
        href="/single"
        className="rounded-md border border-[var(--gold-dim)]/30 px-3 py-1.5 text-xs font-medium text-[var(--gold-bright)] transition-colors hover:border-[var(--gold)]/50 hover:text-[var(--parchment)]"
      >
        Play a reading
      </Link>
      <span className="text-xs text-[var(--parchment-dim)]">
        Change filters above, or earn a spot with more games while signed in.
      </span>
    </EmptyStateWell>
  );
}

function RowAvatar({ entry }: { entry: LeaderboardEntry }) {
  return (
    <div
      className="flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-full border border-[var(--gold)]/40 bg-[var(--plum-mid)]/80 text-sm font-semibold text-[var(--gold-bright)]"
      aria-hidden
    >
      {entry.avatarUrl ? (
        <img
          src={entry.avatarUrl}
          alt=""
          className="h-full w-full object-cover"
          referrerPolicy="no-referrer"
        />
      ) : (
        <span>{entry.displayName.slice(0, 1).toUpperCase()}</span>
      )}
    </div>
  );
}

export function LeaderboardClient() {
  const [metric, setMetric] = useState<LeaderboardMetric>("wins");
  const [mode, setMode] = useState<LeaderboardMode>("ALL");
  const [rows, setRows] = useState<LeaderboardEntry[] | null>(null);
  const [currentUserEntry, setCurrentUserEntry] = useState<LeaderboardEntry | null>(null);
  const [notQualifiedReason, setNotQualifiedReason] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setErr(null);
    try {
      const data = await fetchLeaderboard({ metric, mode, limit: 50 });
      setRows(data.entries);
      setCurrentUserEntry(data.currentUserEntry);
      setNotQualifiedReason(data.currentUserNotQualifiedReason);
    } catch (e: unknown) {
      setErr(e instanceof Error ? e.message : "Something went wrong.");
      setRows(null);
      setCurrentUserEntry(null);
      setNotQualifiedReason(null);
    } finally {
      setLoading(false);
    }
  }, [metric, mode]);

  useEffect(() => {
    void load();
  }, [load]);

  const showYourRankBlock =
    currentUserEntry != null &&
    rows != null &&
    !rows.some((e) => e.userId === currentUserEntry.userId);

  return (
    <RouteShell
      title="Leaderboard"
      description="Top readers by completed games. Registered players only, lifetime stats."
      className="max-w-5xl"
    >
      <div className="space-y-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div className="grid w-full gap-3 sm:grid-cols-2 sm:gap-4">
            <div className="min-w-0">
              <label
                htmlFor="lb-metric"
                className="mb-1.5 block text-xs font-medium uppercase tracking-[0.12em] text-[var(--mist)]"
              >
                Metric
              </label>
              <select
                id="lb-metric"
                className={selectClassName()}
                value={metric}
                onChange={(e) => setMetric(e.target.value as LeaderboardMetric)}
              >
                <option value="wins">Wins</option>
                <option value="winRate">Win rate</option>
              </select>
            </div>
            <div className="min-w-0">
              <label
                htmlFor="lb-mode"
                className="mb-1.5 block text-xs font-medium uppercase tracking-[0.12em] text-[var(--mist)]"
              >
                Mode
              </label>
              <select
                id="lb-mode"
                className={selectClassName()}
                value={mode}
                onChange={(e) => setMode(e.target.value as LeaderboardMode)}
              >
                {MODES.map((m) => (
                  <option key={m.value} value={m.value}>
                    {m.label}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {metric === "winRate" ? (
          <p className="rounded-md border border-[var(--gold)]/12 bg-[var(--plum-mid)]/20 px-3 py-2 text-xs leading-relaxed text-[var(--parchment-dim)] sm:text-sm">
            <span className="text-[var(--gold-dim)]">Rule: </span>
            win rate only ranks readers with at least <strong className="text-[var(--parchment)]/90">10</strong>{" "}
            completed games in the selected scope. Fewer games means not listed — that’s
            different from an empty table when no one qualifies yet.
          </p>
        ) : null}

        {notQualifiedReason ? (
          <p
            className="rounded-md border border-[var(--wine-deep)]/50 bg-[var(--plum-mid)]/25 px-3 py-2 text-sm leading-relaxed text-[var(--parchment-dim)]"
            role="status"
          >
            {notQualifiedReason}
          </p>
        ) : null}

        {loading ? (
          <p className="text-sm text-[var(--mist)]">Loading…</p>
        ) : err ? (
          <p className="text-sm text-red-300/90">{err}</p>
        ) : rows?.length === 0 ? (
          <LeaderboardEmptyState metric={metric} mode={mode} />
        ) : rows ? (
          <div className="-mx-1 overflow-x-auto sm:mx-0">
            <table className="w-full min-w-[640px] border-collapse text-left text-sm">
              <thead>
                <tr className="border-b border-[var(--gold)]/20 text-xs uppercase tracking-wide text-[var(--mist)]">
                  <th scope="col" className="pb-2 pr-2 font-medium">
                    #
                  </th>
                  <th scope="col" className="pb-2 pr-2 font-medium">
                    Player
                  </th>
                  <th scope="col" className="pb-2 pr-2 text-right font-medium">
                    Wins
                  </th>
                  <th scope="col" className="pb-2 pr-2 text-right font-medium">
                    Played
                  </th>
                  <th scope="col" className="pb-2 pr-2 text-right font-medium">
                    Win rate
                  </th>
                  <th scope="col" className="whitespace-nowrap pb-2 pr-0 font-medium">
                    Last played
                  </th>
                </tr>
              </thead>
              <tbody>
                {rows.map((entry) => {
                  const isYou =
                    currentUserEntry != null && entry.userId === currentUserEntry.userId;
                  return (
                  <tr
                    key={entry.userId}
                    className={cn(
                      "border-b border-[var(--wine-deep)]/60 last:border-0",
                      isYou && "bg-[var(--gold)]/[0.06]",
                    )}
                  >
                    <td className="align-middle py-2.5 pr-2 text-[var(--parchment-dim)] tabular-nums">
                      {entry.rank}
                    </td>
                    <td className="align-middle py-2.5 pr-2">
                      <div className="flex min-w-0 items-center gap-2.5">
                        <RowAvatar entry={entry} />
                        <div className="min-w-0 flex-1">
                          <Link
                            href={`/u/${encodeURIComponent(entry.userId)}`}
                            className="font-medium text-[var(--gold-bright)] hover:underline"
                          >
                            {entry.displayName}
                          </Link>
                        </div>
                      </div>
                    </td>
                    <td className="whitespace-nowrap py-2.5 pr-2 text-right tabular-nums text-[var(--parchment)]">
                      {entry.gamesWon}
                    </td>
                    <td className="whitespace-nowrap py-2.5 pr-2 text-right tabular-nums text-[var(--parchment-dim)]">
                      {entry.gamesPlayed}
                    </td>
                    <td className="whitespace-nowrap py-2.5 pr-2 text-right tabular-nums text-[var(--parchment)]">
                      {formatWinRate(entry.winRate)}
                    </td>
                    <td className="whitespace-nowrap py-2.5 pr-0 text-xs text-[var(--parchment-dim)]">
                      {formatLastPlayed(entry.lastPlayedAt)}
                    </td>
                  </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : null}

        {showYourRankBlock && currentUserEntry ? (
          <div
            className="rounded-md border border-[var(--gold)]/25 bg-[var(--void-deep)]/40 px-4 py-3"
            role="region"
            aria-label="Your rank"
          >
            <p className="mb-2 text-xs font-medium uppercase tracking-[0.1em] text-[var(--mist)]">
              Your rank
            </p>
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-4">
              <p className="text-lg font-medium tabular-nums text-[var(--gold-bright)]">
                #{currentUserEntry.rank}
              </p>
              <div className="flex min-w-0 items-center gap-2.5">
                <RowAvatar entry={currentUserEntry} />
                <Link
                  href={`/u/${encodeURIComponent(currentUserEntry.userId)}`}
                  className="truncate font-medium text-[var(--gold-bright)] hover:underline"
                >
                  {currentUserEntry.displayName}
                </Link>
              </div>
              <p className="text-sm text-[var(--parchment-dim)] sm:ml-auto">
                {currentUserEntry.gamesWon} wins · {currentUserEntry.gamesPlayed} played ·{" "}
                {formatWinRate(currentUserEntry.winRate)} · {formatLastPlayed(currentUserEntry.lastPlayedAt)}
              </p>
            </div>
          </div>
        ) : null}
      </div>
    </RouteShell>
  );
}

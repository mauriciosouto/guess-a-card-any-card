"use client";

import Link from "next/link";
import { useCallback, useState } from "react";
import type { PublicProfileResponse } from "@/lib/profile/types";
import { Button } from "@/components/ui/button";
import { EmptyStateWell } from "@/components/ui/empty-state";
import { Panel } from "@/components/ui/panel";
import { siteConfig } from "@/lib/config/site";
import { getPublicSiteUrl } from "@/lib/config/site-url";
import { shareContent } from "@/lib/share/share-content";
import { cn } from "@/lib/utils/cn";

function formatMode(m: string): string {
  if (m === "SINGLE") return "Single";
  if (m === "CHALLENGE") return "Challenge";
  if (m === "COOP") return "Co-op";
  if (m === "COMPETITIVE") return "Multiplayer";
  return m;
}

function formatTimeMs(ms: number | null): string {
  if (ms == null) return "—";
  if (ms < 1000) return `${ms} ms`;
  return `${(ms / 1000).toFixed(1)} s`;
}

type ProfileViewProps = {
  data: PublicProfileResponse;
  showEmail?: boolean;
  showPublicLink?: boolean;
  /** "Share profile" (signed-in /profile). */
  showShare?: boolean;
  /** `/profile` (true) vs public `/u/...` (false) — copy and CTAs. */
  isOwnProfile?: boolean;
};

export function ProfileView({
  data,
  showEmail,
  showPublicLink,
  showShare,
  isOwnProfile = true,
}: ProfileViewProps) {
  const { stats } = data;
  const hasNoGames = stats.gamesPlayed === 0;
  const [shareFeedback, setShareFeedback] = useState<string | null>(null);

  const onShareProfile = useCallback(() => {
    setShareFeedback(null);
    const origin =
      typeof window !== "undefined" ? window.location.origin : getPublicSiteUrl();
    const path = `/u/${encodeURIComponent(data.id)}`;
    const url = `${origin.replace(/\/$/, "")}${path}`;
    const text = `Check out my Flesh and Blood stats 🔥\n\n${siteConfig.shortName}`;

    void shareContent({
      title: data.displayName,
      text,
      url,
      onFeedback: (m) => {
        setShareFeedback(m);
        window.setTimeout(() => setShareFeedback(null), 3000);
      },
    });
  }, [data.displayName, data.id]);

  return (
    <div className="space-y-8">
      <div className="flex flex-col items-center gap-4 sm:flex-row sm:items-start sm:gap-6">
        <div className="flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-full border-2 border-[var(--gold)]/50 bg-[var(--plum-mid)]/80 text-2xl font-semibold text-[var(--gold-bright)]">
          {data.avatarUrl ? (
            <img
              src={data.avatarUrl}
              alt=""
              className="h-full w-full object-cover"
              referrerPolicy="no-referrer"
            />
          ) : (
            <span aria-hidden>{data.displayName.slice(0, 1).toUpperCase()}</span>
          )}
        </div>
        <div className="min-w-0 flex-1 text-center sm:text-left">
          <h2 className="font-display text-xl font-semibold tracking-wide text-[var(--parchment)] sm:text-2xl">
            {data.displayName}
          </h2>
          {showEmail && data.email ? (
            <p className="mt-1 text-sm text-[var(--mist)]">{data.email}</p>
          ) : null}
          <p className="mt-1 text-xs text-[var(--parchment-dim)]">
            Member since{" "}
            {new Date(data.memberSince).toLocaleDateString(undefined, {
              year: "numeric",
              month: "short",
              day: "numeric",
            })}
          </p>
          {data.bio ? (
            <p className="mt-3 text-sm leading-relaxed text-[var(--mist)]">{data.bio}</p>
          ) : null}
          {showPublicLink ? (
            <p className="mt-2 text-sm">
              <Link
                href={`/u/${data.id}`}
                className="text-[var(--gold-bright)] underline-offset-2 hover:underline"
              >
                Public profile link
              </Link>
            </p>
          ) : null}
          {showShare ? (
            <div className="mt-4 flex min-w-0 flex-col items-center gap-1 sm:items-start">
              <Button type="button" variant="outline" onClick={() => void onShareProfile()}>
                Share profile
              </Button>
              {shareFeedback ? (
                <span
                  className="text-xs text-[var(--gold-dim)]"
                  role="status"
                  aria-live="polite"
                >
                  {shareFeedback}
                </span>
              ) : null}
            </div>
          ) : null}
        </div>
      </div>

      <section className="space-y-2">
        <h3 className="font-display text-sm font-semibold uppercase tracking-[0.14em] text-[var(--parchment-dim)]">
          Totals
        </h3>
        {hasNoGames ? (
          <EmptyStateWell
            title="No games in the book yet"
            description={
              isOwnProfile
                ? "The tally stays empty until you finish a reading. Start a solitary run, send a challenge, or join a circle — a few completed games will start filling wins, records, and this panel."
                : "This player hasn’t finished a recorded game yet, so there’s no score to show. Check back after they play."
            }
          >
            {isOwnProfile ? (
              <>
                <Button variant="outline" size="sm" asChild>
                  <Link href="/single">Start a reading</Link>
                </Button>
                <Button variant="ghost" size="sm" asChild>
                  <Link href="/challenge">Send a challenge</Link>
                </Button>
                <Button variant="ghost" size="sm" asChild>
                  <Link href="/coop">Play co-op</Link>
                </Button>
              </>
            ) : null}
          </EmptyStateWell>
        ) : (
          <Panel variant="textured" className="border-[var(--gold)]/12 p-4 sm:p-5">
            <dl className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              <div>
                <dt className="text-xs text-[var(--mist)]">Games played</dt>
                <dd className="text-lg font-semibold text-[var(--parchment)]">{stats.gamesPlayed}</dd>
              </div>
              <div>
                <dt className="text-xs text-[var(--mist)]">Won</dt>
                <dd className="text-lg font-semibold text-[var(--gold-bright)]">{stats.gamesWon}</dd>
              </div>
              <div>
                <dt className="text-xs text-[var(--mist)]">Lost</dt>
                <dd className="text-lg font-semibold text-[var(--parchment)]">{stats.gamesLost}</dd>
              </div>
              <div>
                <dt className="text-xs text-[var(--mist)]">Avg attempts (wins)</dt>
                <dd className="text-lg font-semibold text-[var(--parchment)]">
                  {stats.averageAttemptsToWin ?? "—"}
                </dd>
              </div>
              <div>
                <dt className="text-xs text-[var(--mist)]">Best attempts</dt>
                <dd className="text-lg font-semibold text-[var(--parchment)]">
                  {stats.bestAttemptsRecord ?? "—"}
                </dd>
              </div>
              <div>
                <dt className="text-xs text-[var(--mist)]">Best time (win)</dt>
                <dd className="text-lg font-semibold text-[var(--parchment)]">
                  {formatTimeMs(stats.bestTimeRecordMs)}
                </dd>
              </div>
              {stats.lastPlayedAt ? (
                <div className="col-span-2 sm:col-span-3">
                  <dt className="text-xs text-[var(--mist)]">Last reading</dt>
                  <dd className="text-sm text-[var(--parchment)]">
                    {new Date(stats.lastPlayedAt).toLocaleString()}
                  </dd>
                </div>
              ) : null}
            </dl>
          </Panel>
        )}
      </section>

      <section className="space-y-2">
        <h3 className="font-display text-sm font-semibold uppercase tracking-[0.14em] text-[var(--parchment-dim)]">
          Recent games
        </h3>
        {data.recentGames.length > 0 ? (
          <ul className="space-y-2">
            {data.recentGames.map((g) => (
              <li
                key={g.gameId}
                className="flex flex-wrap items-baseline justify-between gap-2 rounded-md border border-[var(--wine-deep)]/50 bg-[var(--void)]/40 px-3 py-2 text-sm"
              >
                <span className="font-medium text-[var(--parchment)]">{g.cardName}</span>
                <span className="text-xs text-[var(--mist)]">
                  {formatMode(g.mode)} · {g.didWin ? "Win" : "Loss"} ·{" "}
                  {g.finishedAt ? new Date(g.finishedAt).toLocaleDateString() : "—"}
                </span>
              </li>
            ))}
          </ul>
        ) : (
          <EmptyStateWell
            compact
            title={hasNoGames ? "The trail starts empty" : "No recent games listed"}
            description={
              hasNoGames
                ? isOwnProfile
                  ? "Finished games will be listed here with card name, mode, and win or loss — your storyboard after the veil lifts."
                  : "Their most recent games will show here once they’ve completed one."
                : "The archive is catching up, or the last run was a while ago."
            }
          />
        )}
      </section>

      <section className="space-y-2">
        <h3 className="font-display text-sm font-semibold uppercase tracking-[0.14em] text-[var(--parchment-dim)]">
          Recent challenges (hosted)
        </h3>
        {data.recentChallengesHosted.length > 0 ? (
          <ul className="space-y-2">
            {data.recentChallengesHosted.map((c) => (
              <li
                key={c.challengeId}
                className="flex flex-wrap items-baseline justify-between gap-2 rounded-md border border-[var(--wine-deep)]/50 bg-[var(--void)]/40 px-3 py-2 text-sm"
              >
                <span className="font-medium text-[var(--parchment)]">{c.cardName}</span>
                <span className="text-xs text-[var(--mist)]">
                  {c.status}
                  {c.outcome ? ` · ${c.outcome}` : ""} ·{" "}
                  {new Date(c.createdAt).toLocaleDateString()}
                </span>
              </li>
            ))}
          </ul>
        ) : (
          <EmptyStateWell
            compact
            title="No challenges in view"
            description={
              isOwnProfile
                ? "When you create a challenge link, those duels are listed here so you can see what you’ve put into play."
                : "They haven’t hosted a challenge that appears in this list yet (or it’s from before we started tracking here)."
            }
          >
            {isOwnProfile ? (
              <Button variant="outline" size="sm" asChild>
                <Link href="/challenge">Open challenges</Link>
              </Button>
            ) : null}
          </EmptyStateWell>
        )}
      </section>
    </div>
  );
}

export function ProfileSignInCta({ className }: { className?: string }) {
  return (
    <div className={cn("text-center", className)}>
      <p className="text-sm text-[var(--mist)]">
        Sign in to see your name, reading tally, and history on your profile.
      </p>
      <div className="mt-4 flex flex-wrap justify-center gap-3">
        <Link
          href="/login"
          className="rounded-md border border-[var(--gold)]/55 bg-[var(--plum-mid)]/90 px-4 py-2 text-sm font-semibold text-[var(--gold-bright)] transition-colors hover:border-[var(--gold-bright)]/80"
        >
          Sign in
        </Link>
        <Link
          href="/single"
          className="rounded-md px-4 py-2 text-sm text-[var(--mist)] hover:text-[var(--parchment)]"
        >
          Play as guest
        </Link>
      </div>
    </div>
  );
}

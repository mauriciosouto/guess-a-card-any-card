import type { Metadata } from "next";
import { PublicProfileClient } from "./public-profile-client";
import { getPublicSiteUrl } from "@/lib/config/site-url";
import { siteConfig } from "@/lib/config/site";
import type { PublicProfileResponse } from "@/lib/profile/types";

type PageProps = { params: Promise<{ userId: string }> };

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { userId } = await params;
  const base = getPublicSiteUrl();
  let displayName = "Player";
  let wins = 0;
  let played = 0;
  let winPct = 0;

  try {
    const res = await fetch(`${base}/api/profile/${encodeURIComponent(userId)}`, {
      next: { revalidate: 60 },
    });
    if (res.ok) {
      const d = (await res.json()) as PublicProfileResponse;
      displayName = d.displayName || displayName;
      wins = d.stats.gamesWon;
      played = d.stats.gamesPlayed;
      winPct = played > 0 ? Math.round((wins / played) * 100) : 0;
    }
  } catch {
    /* use fallbacks */
  }

  const title = `${displayName}'s stats`;
  const description = `${wins} wins · ${played} games · ${winPct}% win rate`;

  return {
    title,
    description,
    openGraph: {
      title: `${title} · ${siteConfig.shortName}`,
      description,
    },
  };
}

export default async function PublicUserProfilePage({ params }: PageProps) {
  const { userId } = await params;
  return <PublicProfileClient userId={userId} />;
}

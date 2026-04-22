import type { Metadata } from "next";
import { siteConfig } from "@/lib/config/site";
import { LeaderboardClient } from "./leaderboard-client";

export const metadata: Metadata = {
  title: "Top players leaderboard",
  description: "See the best players — lifetime wins and win rate by mode.",
  openGraph: {
    title: "Top players leaderboard",
    description: "See the best players",
  },
  twitter: {
    card: "summary",
    title: "Top players leaderboard",
    description: "See the best players",
  },
};

export default function LeaderboardPage() {
  return <LeaderboardClient />;
}

"use client";

import { useCallback, useState } from "react";
import { Button } from "@/components/ui/button";
import { shareContent } from "@/lib/share/share-content";
import { siteConfig } from "@/lib/config/site";
import { getPublicSiteUrl } from "@/lib/config/site-url";
import { cn } from "@/lib/utils/cn";
import type { SingleGameSnapshot } from "@/types/single-game";

type ModeLabel = "Single" | "Challenge";

function buildGameResultShareText(
  game: Pick<SingleGameSnapshot, "status" | "attemptCount">,
  mode: ModeLabel,
): string {
  const n = game.attemptCount;
  const tryWord = n === 1 ? "try" : "tries";
  const product = "Flesh and Blood";

  if (game.status === "WON") {
    return `I guessed this ${product} card in ${n} ${tryWord} 🔥\n\n(${mode} · ${siteConfig.shortName})`;
  }
  if (game.status === "CANCELLED") {
    return `${product} reading — ${n} ${tryWord} before yielding. (${mode})`;
  }
  return `${product} reading — ${n} ${tryWord}. The veil stayed closed. (${mode})`;
}

export type ShareGameResultButtonProps = {
  game: Pick<SingleGameSnapshot, "status" | "attemptCount">;
  mode: ModeLabel;
  className?: string;
};

export function ShareGameResultButton({ game, mode, className }: ShareGameResultButtonProps) {
  const [feedback, setFeedback] = useState<string | null>(null);

  const onShare = useCallback(() => {
    setFeedback(null);
    const text = buildGameResultShareText(game, mode);
    const origin =
      typeof window !== "undefined" ? window.location.origin : getPublicSiteUrl();
    const url = `${origin.replace(/\/$/, "")}/`;

    void shareContent({
      title: `${siteConfig.shortName} — reading`,
      text,
      url,
      onFeedback: (m) => {
        setFeedback(m);
        window.setTimeout(() => setFeedback(null), 3000);
      },
    });
  }, [game, mode]);

  return (
    <div className="flex min-w-0 flex-col items-center gap-1 lg:items-start">
      <Button
        type="button"
        variant="outline"
        onClick={() => void onShare()}
        className={cn(className)}
      >
        Share result
      </Button>
      {feedback ? (
        <span className="text-xs text-[var(--gold-dim)]" role="status" aria-live="polite">
          {feedback}
        </span>
      ) : null}
    </div>
  );
}

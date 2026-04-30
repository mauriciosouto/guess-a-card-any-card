"use client";

import { Panel } from "@/components/ui/panel";
import { Button } from "@/components/ui/button";

type ModeHowToPanelProps = {
  title: string;
  intro: string;
  howItWorks: readonly string[];
  trackedStats: readonly string[];
  tips: readonly string[];
  summaryLabel: string;
  middleSectionTitle?: string;
  ctaLabel?: string;
  ctaHref?: string;
};

/**
 * Compact, scan-first onboarding block for mode-specific gameplay.
 * Wrapped in <details> so experienced players can ignore it quickly.
 */
export function ModeHowToPanel({
  title,
  intro,
  howItWorks,
  trackedStats,
  tips,
  summaryLabel,
  middleSectionTitle = "Stats (registered users)",
  ctaLabel,
  ctaHref,
}: ModeHowToPanelProps) {
  return (
    <Panel variant="textured" className="border-[var(--gold)]/15 p-4 sm:p-5">
      <details className="group">
        <summary className="flex cursor-pointer list-none items-center justify-between gap-3">
          <span className="font-display text-xs font-semibold uppercase tracking-[0.2em] text-[var(--gold-bright)]">
            {summaryLabel}
          </span>
          <span
            className="text-xs text-[var(--mist)] transition-transform duration-200 group-open:rotate-180"
            aria-hidden
          >
            ▼
          </span>
        </summary>

        <div className="mt-4 space-y-5">
          <div className="space-y-2">
            <h2 className="font-display text-lg font-semibold tracking-[0.06em] text-[var(--parchment)]">
              {title}
            </h2>
            <p className="text-sm leading-relaxed text-[var(--parchment-dim)]">{intro}</p>
          </div>

          <section className="space-y-2">
            <h3 className="font-display text-[0.7rem] font-semibold uppercase tracking-[0.2em] text-[var(--gold-dim)]">
              How it works
            </h3>
            <ol className="space-y-2 text-sm leading-relaxed text-[var(--parchment-dim)]">
              {howItWorks.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ol>
          </section>

          <section className="space-y-2">
            <h3 className="font-display text-[0.7rem] font-semibold uppercase tracking-[0.2em] text-[var(--gold-dim)]">
              {middleSectionTitle}
            </h3>
            <ul className="grid gap-1 text-sm text-[var(--parchment-dim)] sm:grid-cols-2">
              {trackedStats.map((item) => (
                <li key={item}>- {item}</li>
              ))}
            </ul>
          </section>

          <section className="space-y-2">
            <h3 className="font-display text-[0.7rem] font-semibold uppercase tracking-[0.2em] text-[var(--gold-dim)]">
              Tips
            </h3>
            <ul className="space-y-1.5 text-sm leading-relaxed text-[var(--parchment-dim)]">
              {tips.map((item) => (
                <li key={item}>- {item}</li>
              ))}
            </ul>
          </section>

          {ctaLabel && ctaHref ? (
            <Button asChild size="sm">
              <a href={ctaHref}>{ctaLabel}</a>
            </Button>
          ) : null}
        </div>
      </details>
    </Panel>
  );
}

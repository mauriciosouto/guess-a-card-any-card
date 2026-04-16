"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Drawer } from "@/components/ui/drawer";
import { Panel } from "@/components/ui/panel";
import { cn } from "@/lib/utils/cn";

export type HistoryEntry = {
  id: string;
  step: number;
  guess: string;
  outcome: "correct" | "wrong" | "pending";
  at?: string;
  /** Who submitted (e.g. co-op seer name). */
  spokenBy?: string;
};

export type GameHistoryPanelProps = {
  entries: HistoryEntry[];
  className?: string;
  /** Inline list on small screens too (no floating button). Use on end-game / summary screens. */
  alwaysShowList?: boolean;
  /** Mobile FAB: extra classes e.g. offset above sticky guess bar (`bottom-24`). */
  mobileFabClassName?: string;
  /** Sliding sheet panel (see `Drawer` `panelClassName`). */
  drawerPanelClassName?: string;
};

function HistoryList({ entries }: { entries: HistoryEntry[] }) {
  if (entries.length === 0) {
    return (
      <p className="text-sm leading-relaxed text-[var(--parchment-dim)]">
        Guesses will trace their marks here — each attempt a thread in the reading.
      </p>
    );
  }

  return (
    <ul className="space-y-3">
      {entries.map((e) => (
        <li key={e.id}>
          <Panel
            variant="subtle"
            className={cn(
              "border px-4 py-3.5 transition-[border-color,box-shadow] duration-300 sm:px-4",
              e.outcome === "correct" &&
                "border-emerald-800/50 shadow-[0_0_16px_rgba(52,211,153,0.12)]",
              e.outcome === "wrong" && "border-[var(--blood)]/40",
            )}
          >
            <div className="flex items-start justify-between gap-3">
              <span className="font-display text-[0.65rem] font-semibold uppercase tracking-[0.2em] text-[var(--gold-dim)]">
                {e.outcome === "correct"
                  ? "Truth bound"
                  : e.outcome === "wrong"
                    ? "Miss"
                    : "Waiting"}
              </span>
              <span className="shrink-0 text-[0.65rem] tabular-nums text-[var(--mist)]">
                Step {e.step}
              </span>
            </div>
            <p className="mt-2.5 font-medium leading-snug text-[var(--parchment)]">{e.guess}</p>
            {e.spokenBy ? (
              <p className="mt-1.5 text-[0.7rem] text-[var(--mist)]">— {e.spokenBy}</p>
            ) : null}
          </Panel>
        </li>
      ))}
    </ul>
  );
}

/**
 * Desktop: persistent sidebar. Mobile: primary action opens rune-styled drawer (blueprint HistoryDrawer).
 */
export function GameHistoryPanel({
  entries,
  className,
  alwaysShowList,
  mobileFabClassName,
  drawerPanelClassName,
}: GameHistoryPanelProps) {
  const [drawerOpen, setDrawerOpen] = useState(false);

  if (alwaysShowList) {
    return (
      <Panel variant="textured" className={cn("border-[var(--gold)]/20 p-4", className)}>
        <h3 className="font-display mb-4 text-center text-xs font-semibold uppercase tracking-[0.28em] text-[var(--gold-bright)]">
          Sigil log
        </h3>
        <HistoryList entries={entries} />
      </Panel>
    );
  }

  return (
    <>
      <div
        className={cn(
          "relative z-0 hidden lg:block",
          className,
        )}
      >
        <Panel variant="textured" className="border-[var(--gold)]/20 p-4">
          <h3 className="font-display mb-4 text-center text-xs font-semibold uppercase tracking-[0.28em] text-[var(--gold-bright)]">
            Sigil log
          </h3>
          <HistoryList entries={entries} />
        </Panel>
      </div>

      <div
        className={cn(
          "fixed left-1/2 z-30 -translate-x-1/2 lg:hidden",
          "bottom-[max(1rem,env(safe-area-inset-bottom))]",
          mobileFabClassName,
        )}
      >
        <Button
          type="button"
          variant="secondary"
          size="sm"
          className="border border-[var(--gold)]/25 shadow-[0_8px_32px_rgba(0,0,0,0.55),0_0_24px_rgba(201,162,39,0.12)]"
          onClick={() => setDrawerOpen(true)}
        >
          Sigil log
        </Button>
      </div>

      <Drawer
        open={drawerOpen}
        onOpenChange={setDrawerOpen}
        title="Sigil log"
        panelClassName={drawerPanelClassName}
      >
        <HistoryList entries={entries} />
      </Drawer>
    </>
  );
}

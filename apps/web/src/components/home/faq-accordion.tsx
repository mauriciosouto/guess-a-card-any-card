"use client";

import { useState } from "react";
import { cn } from "@/lib/utils/cn";

interface FaqItem {
  q: string;
  a: string;
}

export function FaqAccordion({ items }: { items: readonly FaqItem[] }) {
  const [open, setOpen] = useState<number | null>(null);

  return (
    <div className="divide-y divide-[var(--wine-deep)]/50 overflow-hidden rounded-xl border border-[var(--wine-deep)]/70 bg-[var(--void)]/40 backdrop-blur-sm">
      {items.map(({ q, a }, i) => (
        <div key={q}>
          <button
            type="button"
            onClick={() => setOpen(open === i ? null : i)}
            className={cn(
              "flex w-full items-center justify-between gap-4 px-5 py-4 text-left transition-colors duration-150",
              "hover:bg-[var(--plum)]/25",
              open === i && "bg-[var(--plum)]/20",
            )}
            aria-expanded={open === i}
          >
            <span className="text-sm font-medium text-[var(--parchment)]">{q}</span>
            <span
              className={cn(
                "shrink-0 text-lg font-light text-[var(--gold-dim)] transition-transform duration-200 select-none",
                open === i && "rotate-45",
              )}
              aria-hidden
            >
              +
            </span>
          </button>

          {open === i && (
            <div className="px-5 pb-4 pt-1">
              <p className="text-sm leading-relaxed text-[var(--parchment-dim)]">{a}</p>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

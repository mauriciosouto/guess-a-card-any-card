"use client";

import { useEffect, useId, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils/cn";

export type SetMultiSelectProps = {
  options: string[];
  value: Set<string>;
  onChange: (next: Set<string>) => void;
  disabled?: boolean;
  /** Empty state when no sets from API */
  emptyLabel?: string;
  className?: string;
};

/**
 * Multi-select dropdown for FAB set codes (`Puzzle.fabSet`), filled from the game `…/sets` API.
 */
export function SetMultiSelect({
  options,
  value,
  onChange,
  disabled,
  emptyLabel = "No FAB set codes on published puzzles yet.",
  className,
}: SetMultiSelectProps) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const listId = useId();

  useEffect(() => {
    if (!open) return;
    function onDoc(e: MouseEvent) {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [open]);

  function toggleOption(name: string) {
    const next = new Set(value);
    if (next.has(name)) next.delete(name);
    else next.add(name);
    onChange(next);
  }

  const summary =
    value.size === 0
      ? "Choose one or more sets (FaB)…"
      : value.size === 1
        ? [...value][0]
        : `${value.size} sets selected`;

  return (
    <div ref={rootRef} className={cn("relative", className)}>
      <Button
        type="button"
        variant="outline"
        disabled={disabled || options.length === 0}
        aria-expanded={open}
        aria-haspopup="listbox"
        aria-controls={listId}
        className="h-auto min-h-12 w-full justify-between border-[var(--wine-deep)] px-4 py-3 text-left font-normal text-[var(--parchment)]"
        onClick={() => options.length > 0 && setOpen((o) => !o)}
      >
        <span className="line-clamp-2 text-sm">{options.length === 0 ? emptyLabel : summary}</span>
        <span className="ml-2 shrink-0 text-[var(--gold-dim)]" aria-hidden>
          {open ? "▲" : "▼"}
        </span>
      </Button>
      {open && options.length > 0 ? (
        <div
          id={listId}
          role="listbox"
          aria-multiselectable="true"
          className="absolute z-30 mt-1 max-h-60 w-full overflow-y-auto rounded-lg border border-[var(--gold)]/25 bg-[var(--plum)]/95 py-1 shadow-[0_12px_40px_rgba(0,0,0,0.55)] backdrop-blur-sm"
        >
          {options.map((name) => {
            const checked = value.has(name);
            return (
              <label
                key={name}
                role="option"
                aria-selected={checked}
                className={cn(
                  "flex cursor-pointer items-center gap-3 px-3 py-2.5 text-sm transition-colors",
                  checked
                    ? "bg-[var(--gold)]/12 text-[var(--gold-bright)]"
                    : "text-[var(--parchment-dim)] hover:bg-[var(--void)]/60",
                )}
              >
                <input
                  type="checkbox"
                  checked={checked}
                  onChange={() => toggleOption(name)}
                  className="h-4 w-4 rounded border-[var(--gold-dim)] bg-[var(--void)] text-[var(--gold)]"
                />
                <span className="min-w-0 flex-1">{name}</span>
              </label>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}

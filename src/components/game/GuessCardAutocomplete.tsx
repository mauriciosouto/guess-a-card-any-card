"use client";

import {
  type FormEvent,
  type KeyboardEvent,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import { PendingRitualNote } from "@/components/game/PendingRitualNote";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { singleFetch } from "@/lib/single/single-api";
import { cn } from "@/lib/utils/cn";

const MIN_CHARS = 3;
const DEBOUNCE_MS = 240;

function normName(s: string): string {
  return s.trim().toLowerCase();
}

export type GuessCardAutocompleteProps = {
  value: string;
  onChange: (value: string) => void;
  onSubmit: () => void;
  disabled?: boolean;
  placeholder?: string;
  submitLabel?: string;
  /** Parent-driven: shown under the submit button while the guess is being verified on the server. */
  asyncFeedback?: string | null;
};

/**
 * Guess field with FaB catalog names via `/api/single/cards/search` (@flesh-and-blood/cards).
 * Suggestions only after {@link MIN_CHARS} characters; debounced fetch.
 */
export function GuessCardAutocomplete({
  value,
  onChange,
  onSubmit,
  disabled,
  placeholder = "Card name…",
  submitLabel = "Submit",
  asyncFeedback = null,
}: GuessCardAutocompleteProps) {
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [highlight, setHighlight] = useState(0);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const rootRef = useRef<HTMLDivElement>(null);
  const busyRef = useRef(false);

  const fetchSuggestions = useCallback(async (q: string) => {
    if (q.trim().length < MIN_CHARS) {
      setSuggestions([]);
      setOpen(false);
      return;
    }
    if (busyRef.current) return;
    busyRef.current = true;
    setLoading(true);
    try {
      const res = await singleFetch(
        `/cards/search?q=${encodeURIComponent(q.trim())}`,
      );
      if (!res.ok) {
        setSuggestions([]);
        return;
      }
      const j = (await res.json()) as { names?: string[] };
      const names = j.names ?? [];
      const qNorm = normName(q);
      const filtered = names.filter((n) => normName(n) !== qNorm);
      setSuggestions(filtered);
      setOpen(filtered.length > 0);
      setHighlight(0);
    } finally {
      setLoading(false);
      busyRef.current = false;
    }
  }, []);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (value.trim().length < MIN_CHARS) {
      setSuggestions([]);
      setOpen(false);
      return;
    }
    debounceRef.current = setTimeout(() => {
      void fetchSuggestions(value);
    }, DEBOUNCE_MS);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [value, fetchSuggestions]);

  useEffect(() => {
    function onDoc(e: MouseEvent) {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    setOpen(false);
    onSubmit();
  };

  const onKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (!open || suggestions.length === 0) {
      if (e.key === "Escape") setOpen(false);
      return;
    }
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setHighlight((h) => (h + 1) % suggestions.length);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setHighlight((h) => (h - 1 + suggestions.length) % suggestions.length);
    } else if (e.key === "Escape") {
      setOpen(false);
    } else if (e.key === "Enter" && suggestions[highlight]) {
      e.preventDefault();
      onChange(suggestions[highlight]!);
      setOpen(false);
    }
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="flex w-full flex-col gap-2"
      aria-busy={Boolean(asyncFeedback)}
    >
      <div ref={rootRef} className="relative w-full">
        <Input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={onKeyDown}
          onFocus={() => {
            if (suggestions.length > 0 && value.trim().length >= MIN_CHARS) {
              setOpen(true);
            }
          }}
          placeholder={placeholder}
          disabled={disabled}
          autoComplete="off"
          aria-autocomplete="list"
          aria-expanded={open}
          className="w-full"
        />
        {value.trim().length > 0 && value.trim().length < MIN_CHARS ? (
          <p className="mt-1.5 text-[0.7rem] text-[var(--mist)]">
            Type at least {MIN_CHARS} letters to see card name suggestions.
          </p>
        ) : null}
        {loading ? (
          <p className="mt-1.5 text-[0.65rem] text-[var(--gold-dim)]">Searching…</p>
        ) : null}
        {open && suggestions.length > 0 ? (
          <ul
            role="listbox"
            className="absolute z-40 mt-1 max-h-52 w-full overflow-y-auto rounded-lg border border-[var(--gold)]/30 bg-[var(--plum)]/98 py-1 shadow-[0_16px_48px_rgba(0,0,0,0.6)]"
          >
            {suggestions.map((name, i) => (
              <li key={name} role="option" aria-selected={i === highlight}>
                <button
                  type="button"
                  className={cn(
                    "w-full px-3 py-2 text-left text-sm transition-colors",
                    i === highlight
                      ? "bg-[var(--gold)]/20 text-[var(--gold-bright)]"
                      : "text-[var(--parchment)] hover:bg-[var(--void)]/70",
                  )}
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => {
                    onChange(name);
                    setOpen(false);
                  }}
                >
                  {name}
                </button>
              </li>
            ))}
          </ul>
        ) : null}
      </div>
      <div className="flex w-full flex-col items-end gap-0">
        <Button type="submit" disabled={disabled} className="shrink-0">
          {submitLabel}
        </Button>
        <PendingRitualNote
          show={Boolean(asyncFeedback)}
          label={asyncFeedback ?? ""}
          align="end"
          className="max-w-full pl-2"
        />
      </div>
    </form>
  );
}

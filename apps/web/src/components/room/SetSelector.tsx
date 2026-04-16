"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export type SetSelectorProps = {
  /** Controlled selected set names — parent loads from the `…/sets` API (card catalog). */
  value: string[];
  onChange: (sets: string[]) => void;
};

/** Set selection for match setup — options from the runtime card catalog. */
export function SetSelector({ value, onChange }: SetSelectorProps) {
  const [draft, setDraft] = useState("");

  const add = () => {
    const t = draft.trim();
    if (!t || value.includes(t)) return;
    onChange([...value, t]);
    setDraft("");
  };

  const remove = (set: string) => {
    onChange(value.filter((s) => s !== set));
  };

  return (
    <div className="space-y-3">
      <div className="flex flex-col gap-2 sm:flex-row">
        <Input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder="Name of a deck or source to draw from…"
          className="sm:flex-1"
        />
        <Button type="button" variant="secondary" onClick={add}>
          Add
        </Button>
      </div>
      <ul className="flex flex-wrap gap-2">
        {value.map((s) => (
          <li key={s}>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="text-xs"
              onClick={() => remove(s)}
            >
              {s} ✕
            </Button>
          </li>
        ))}
      </ul>
    </div>
  );
}

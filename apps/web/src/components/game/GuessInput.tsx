"use client";

import { type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export type GuessInputProps = {
  value: string;
  onChange: (value: string) => void;
  onSubmit: () => void;
  disabled?: boolean;
  placeholder?: string;
  submitLabel?: string;
};

/**
 * Guess entry — suggestions/autocomplete wired in a dedicated feature; no search logic here.
 */
export function GuessInput({
  value,
  onChange,
  onSubmit,
  disabled,
  placeholder = "Card name…",
  submitLabel = "Guess",
}: GuessInputProps) {
  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    onSubmit();
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="flex w-full flex-col gap-2 sm:flex-row sm:items-center"
    >
      <Input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        disabled={disabled}
        autoComplete="off"
        className="sm:flex-1"
      />
      <Button type="submit" disabled={disabled} className="sm:w-auto w-full shrink-0">
        {submitLabel}
      </Button>
    </form>
  );
}

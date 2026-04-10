"use client";

import { Button } from "@/components/ui/button";

export type AvatarSelectorProps = {
  selectedId?: string;
  onSelect?: (id: string) => void;
};

const placeholders = ["A", "B", "C", "D"];

/** Replace options with hero/card art ids when assets are wired. */
export function AvatarSelector({ selectedId, onSelect }: AvatarSelectorProps) {
  return (
    <div className="flex flex-wrap gap-2">
      {placeholders.map((id) => (
        <Button
          key={id}
          type="button"
          variant={selectedId === id ? "primary" : "secondary"}
          size="sm"
          onClick={() => onSelect?.(id)}
        >
          {id}
        </Button>
      ))}
    </div>
  );
}

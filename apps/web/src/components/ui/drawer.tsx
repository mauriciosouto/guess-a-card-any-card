"use client";

import { useEffect, type ReactNode } from "react";
import { cn } from "@/lib/utils/cn";
import { Button } from "./button";

export type DrawerProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  children: ReactNode;
  side?: "left" | "right";
  /** Applied to the sliding sheet (e.g. rounded top on mobile). */
  panelClassName?: string;
};

export function Drawer({
  open,
  onOpenChange,
  title,
  children,
  side = "right",
  panelClassName,
}: DrawerProps) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onOpenChange(false);
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onOpenChange]);

  useEffect(() => {
    if (open) document.body.classList.add("overflow-hidden");
    else document.body.classList.remove("overflow-hidden");
    return () => document.body.classList.remove("overflow-hidden");
  }, [open]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex" aria-modal role="dialog" aria-labelledby="drawer-title">
      <button
        type="button"
        className="absolute inset-0 bg-[var(--void-deep)]/80 backdrop-blur-sm transition-opacity"
        aria-label="Close drawer"
        onClick={() => onOpenChange(false)}
      />
      <div
        className={cn(
          "relative ml-auto flex h-full w-full max-w-md flex-col border-l-2 border-[var(--gold)]/25 bg-gradient-to-b from-[var(--plum)] to-[var(--void)] shadow-[-12px_0_48px_rgba(0,0,0,0.55)]",
          side === "left" && "ml-0 mr-auto border-l-0 border-r-2 shadow-[12px_0_48px_rgba(0,0,0,0.55)]",
          panelClassName,
        )}
      >
        <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[var(--gold)]/40 to-transparent" />
        <header className="flex items-center justify-between gap-3 border-b border-[var(--wine-deep)]/90 px-4 py-4">
          <h2
            id="drawer-title"
            className="font-display text-sm font-semibold uppercase tracking-[0.18em] text-[var(--gold-bright)]"
          >
            {title}
          </h2>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="shrink-0 normal-case tracking-normal"
            onClick={() => onOpenChange(false)}
          >
            Close
          </Button>
        </header>
        <div className="min-h-0 flex-1 overflow-y-auto p-4">{children}</div>
      </div>
    </div>
  );
}

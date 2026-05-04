"use client";

import { useEffect, useId, useRef } from "react";
import { createPortal } from "react-dom";
import { Button } from "@/components/ui/button";

export type ConfirmModalProps = {
  open: boolean;
  title: string;
  description: string;
  confirmLabel: string;
  cancelLabel?: string;
  onConfirm: () => void;
  onCancel: () => void;
  /** Stronger styling for destructive confirmations (forfeit, end for everyone, etc.). */
  destructive?: boolean;
};

/**
 * Centered confirmation dialog, portaled to `document.body` so parent `backdrop-filter`
 * does not trap `position: fixed` (same pattern as `LoginModal`).
 */
export function ConfirmModal({
  open,
  title,
  description,
  confirmLabel,
  cancelLabel = "Cancel",
  onConfirm,
  onCancel,
  destructive = false,
}: ConfirmModalProps) {
  const titleId = useId();
  const descId = useId();
  const cancelRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onCancel();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onCancel]);

  useEffect(() => {
    if (open) cancelRef.current?.focus();
  }, [open]);

  if (!open || typeof document === "undefined") {
    return null;
  }

  return createPortal(
    <div className="fixed inset-0 z-[60] overflow-y-auto" role="presentation">
      <button
        type="button"
        className="fixed inset-0 bg-black/65 backdrop-blur-[2px]"
        aria-label="Dismiss"
        onClick={onCancel}
      />
      <div className="flex min-h-full items-center justify-center p-4">
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby={titleId}
          aria-describedby={descId}
          className="relative z-10 w-full max-w-md rounded-lg border border-[var(--wine-deep)]/90 bg-[var(--plum)]/95 p-6 shadow-[0_24px_64px_rgba(0,0,0,0.55)]"
        >
          <h2
            id={titleId}
            className="font-display text-lg font-semibold tracking-wide text-[var(--parchment)]"
          >
            {title}
          </h2>
          <p id={descId} className="mt-3 text-sm leading-relaxed text-[var(--parchment-dim)]">
            {description}
          </p>
          <div className="mt-6 flex flex-wrap justify-end gap-3">
            <Button ref={cancelRef} type="button" variant="outline" size="md" onClick={onCancel}>
              {cancelLabel}
            </Button>
            <Button
              type="button"
              variant={destructive ? "secondary" : "primary"}
              size="md"
              className={
                destructive
                  ? "border-[var(--blood)]/55 text-[var(--gold-bright)] hover:border-[var(--blood)]/80"
                  : undefined
              }
              onClick={onConfirm}
            >
              {confirmLabel}
            </Button>
          </div>
        </div>
      </div>
    </div>,
    document.body,
  );
}

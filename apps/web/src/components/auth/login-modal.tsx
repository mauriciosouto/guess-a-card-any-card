"use client";

import { useEffect, useId, useRef } from "react";
import { createPortal } from "react-dom";
import { LoginPanel } from "@/components/auth/login-panel";

type LoginModalProps = {
  open: boolean;
  onClose: () => void;
};

export function LoginModal({ open, onClose }: LoginModalProps) {
  const titleId = useId();
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  useEffect(() => {
    if (open) {
      panelRef.current?.querySelector<HTMLElement>("button")?.focus();
    }
  }, [open]);

  if (!open || typeof document === "undefined") {
    return null;
  }

  return createPortal(
    <div className="fixed inset-0 z-50 overflow-y-auto" role="presentation">
      {/* Backdrop — rendered via portal so backdrop-filter on the header doesn't confine it */}
      <button
        type="button"
        className="fixed inset-0 bg-black/65 backdrop-blur-[2px]"
        aria-label="Close sign-in"
        onClick={onClose}
      />
      <div className="flex min-h-full items-center justify-center p-4">
        <div
          ref={panelRef}
          role="dialog"
          aria-modal="true"
          aria-labelledby={titleId}
          className="relative z-10 w-full max-w-md rounded-lg border border-[var(--wine-deep)]/90 bg-[var(--plum)]/95 p-6 shadow-[0_24px_64px_rgba(0,0,0,0.55)]"
        >
          <div className="mb-4 flex items-start justify-between gap-3">
            <h2
              id={titleId}
              className="font-display text-lg font-semibold tracking-wide text-[var(--parchment)]"
            >
              Sign in
            </h2>
            <button
              type="button"
              className="rounded-md px-2 py-1 text-sm text-[var(--mist)] hover:bg-[var(--wine)]/50 hover:text-[var(--parchment)]"
              onClick={onClose}
            >
              Close
            </button>
          </div>
          <LoginPanel variant="modal" />
        </div>
      </div>
    </div>,
    document.body,
  );
}

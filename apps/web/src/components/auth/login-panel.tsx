"use client";

import { useState } from "react";
import { useAuth } from "@/components/auth/auth-context";
import { cn } from "@/lib/utils/cn";

type LoginPanelProps = {
  variant: "page" | "modal";
  className?: string;
};

export function LoginPanel({ variant, className }: LoginPanelProps) {
  const {
    isConfigured,
    isLoading,
    signInWithGoogle,
    signInWithDiscord,
    signInWithMagicLink,
  } = useAuth();
  const [email, setEmail] = useState("");
  const [magicBusy, setMagicBusy] = useState(false);
  const [magicMessage, setMagicMessage] = useState<string | null>(null);
  const [magicError, setMagicError] = useState<string | null>(null);
  const [oauthError, setOauthError] = useState<string | null>(null);

  if (isLoading) {
    return (
      <div className={cn("text-sm text-[var(--mist)]", className)}>
        Checking session…
      </div>
    );
  }

  if (!isConfigured) {
    if (process.env.NODE_ENV === "development") {
      return (
        <p className={cn("text-sm text-[var(--mist)]", className)}>
          Sign-in is not configured locally. Set{" "}
          <code className="rounded bg-[var(--wine)]/40 px-1 text-xs">
            NEXT_PUBLIC_SUPABASE_URL
          </code>{" "}
          and{" "}
          <code className="rounded bg-[var(--wine)]/40 px-1 text-xs">
            NEXT_PUBLIC_SUPABASE_ANON_KEY
          </code>{" "}
          in your <code className="rounded bg-[var(--wine)]/40 px-1 text-xs">.env</code>.
        </p>
      );
    }
    return (
      <p className={cn("text-sm text-[var(--mist)]", className)}>
        Sign-in is temporarily unavailable. Please try again later.
      </p>
    );
  }

  const busyLabel = magicBusy ? "Sending…" : "Send magic link";

  return (
    <div className={cn("flex flex-col gap-6", className)}>
      <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap">
        <button
          type="button"
          className="rounded-md border border-[var(--gold)]/50 bg-[var(--plum-mid)]/90 px-4 py-2.5 text-sm font-semibold text-[var(--parchment)] transition-colors hover:border-[var(--gold-bright)]/70 hover:bg-[var(--wine)]/50"
          onClick={async () => {
            setOauthError(null);
            try {
              await signInWithGoogle();
            } catch (e) {
              setOauthError(e instanceof Error ? e.message : "Google sign-in failed.");
            }
          }}
        >
          Continue with Google
        </button>
        <button
          type="button"
          className="rounded-md border border-[var(--gold)]/50 bg-[var(--plum-mid)]/90 px-4 py-2.5 text-sm font-semibold text-[var(--parchment)] transition-colors hover:border-[var(--gold-bright)]/70 hover:bg-[var(--wine)]/50"
          onClick={async () => {
            setOauthError(null);
            try {
              await signInWithDiscord();
            } catch (e) {
              setOauthError(e instanceof Error ? e.message : "Discord sign-in failed.");
            }
          }}
        >
          Continue with Discord
        </button>
      </div>

      {oauthError ? (
        <p className="text-sm text-red-300/90" role="alert">
          {oauthError}
        </p>
      ) : null}

      <div className="border-t border-[var(--wine-deep)]/80 pt-5">
        <p className="mb-2 text-xs font-medium uppercase tracking-[0.12em] text-[var(--parchment-dim)]">
          Email magic link
        </p>
        <form
          className="flex flex-col gap-3 sm:flex-row sm:items-end"
          onSubmit={async (ev) => {
            ev.preventDefault();
            setMagicError(null);
            setMagicMessage(null);
            if (!email.trim()) {
              setMagicError("Enter your email.");
              return;
            }
            setMagicBusy(true);
            const { error } = await signInWithMagicLink(email);
            setMagicBusy(false);
            if (error) {
              setMagicError(error.message);
              return;
            }
            setMagicMessage(
              "Check your inbox for a sign-in link. You can close this window and return after clicking it.",
            );
            setEmail("");
          }}
        >
          <label className="flex min-w-0 flex-1 flex-col gap-1 text-xs text-[var(--mist)]">
            <span className="sr-only">Email</span>
            <input
              type="email"
              name="email"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              className="rounded-md border border-[var(--wine-deep)]/90 bg-[var(--void)]/80 px-3 py-2 text-sm text-[var(--parchment)] placeholder:text-[var(--mist)]/50 focus:border-[var(--gold)]/50 focus:outline-none"
            />
          </label>
          <button
            type="submit"
            disabled={magicBusy}
            className="shrink-0 rounded-md bg-[var(--gold)]/90 px-4 py-2 text-sm font-semibold text-[var(--void)] transition-opacity disabled:opacity-50"
          >
            {busyLabel}
          </button>
        </form>
        {magicError ? (
          <p className="mt-2 text-sm text-red-300/90" role="alert">
            {magicError}
          </p>
        ) : null}
        {magicMessage ? (
          <p className="mt-2 text-sm text-[var(--gold-bright)]/90" role="status">
            {magicMessage}
          </p>
        ) : null}
      </div>

      {variant === "modal" ? (
        <p className="text-xs text-[var(--mist)]">
          Guest play stays available without an account. Signing in is optional.
        </p>
      ) : null}
    </div>
  );
}

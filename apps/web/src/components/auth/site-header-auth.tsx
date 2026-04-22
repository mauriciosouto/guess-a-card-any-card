"use client";

import Link from "next/link";
import { useState } from "react";
import { useAuth } from "@/components/auth/auth-context";
import { LoginModal } from "@/components/auth/login-modal";
import { cn } from "@/lib/utils/cn";

function displayLabel(user: {
  email?: string | null;
  user_metadata?: Record<string, unknown>;
}): string {
  const meta = user.user_metadata;
  const full =
    meta && typeof meta.full_name === "string"
      ? meta.full_name.trim()
      : meta && typeof meta.name === "string"
        ? meta.name.trim()
        : "";
  if (full) {
    return full;
  }
  return user.email?.split("@")[0]?.trim() || "Account";
}

function avatarUrl(user: {
  user_metadata?: Record<string, unknown>;
}): string | null {
  const meta = user.user_metadata;
  if (meta && typeof meta.avatar_url === "string" && meta.avatar_url.length > 0) {
    return meta.avatar_url;
  }
  if (meta && typeof meta.picture === "string" && meta.picture.length > 0) {
    return meta.picture;
  }
  return null;
}

export function SiteHeaderAuth() {
  const { user, isLoading, isConfigured, signOut } = useAuth();
  const [loginOpen, setLoginOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  if (isLoading) {
    return (
      <div
        className="h-10 w-10 shrink-0 rounded-full border border-[var(--gold)]/25 bg-[var(--plum-mid)]/60"
        aria-hidden
      />
    );
  }

  if (!user) {
    return (
      <>
        <button
          type="button"
          onClick={() => setLoginOpen(true)}
          disabled={!isConfigured}
          className={cn(
            "rounded-md px-3 py-2 text-xs font-semibold uppercase tracking-[0.12em] transition-colors sm:text-sm",
            isConfigured
              ? "border border-[var(--gold)]/55 text-[var(--gold-bright)] hover:border-[var(--gold-bright)]/80 hover:bg-[var(--wine)]/40"
              : "cursor-not-allowed border border-[var(--wine-deep)]/80 text-[var(--mist)]",
          )}
        >
          Sign in
        </button>
        <LoginModal open={loginOpen} onClose={() => setLoginOpen(false)} />
      </>
    );
  }

  const label = displayLabel(user);
  const url = avatarUrl(user);
  const initial = label.slice(0, 1).toUpperCase();

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setMenuOpen((v) => !v)}
        className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-full border-2 border-[var(--gold)]/45 bg-[var(--plum-mid)]/80 text-sm font-semibold text-[var(--gold-bright)] shadow-[0_0_16px_rgba(201,162,39,0.2)] transition-[box-shadow,transform] hover:scale-[1.03] hover:shadow-[0_0_24px_rgba(201,162,39,0.35)]"
        aria-expanded={menuOpen}
        aria-haspopup="menu"
        aria-label={`Account menu for ${label}`}
      >
        {url ? (
          // eslint-disable-next-line @next/next/no-img-element -- provider avatar URLs are dynamic hosts
          <img
            src={url}
            alt=""
            width={40}
            height={40}
            className="h-full w-full object-cover"
            referrerPolicy="no-referrer"
          />
        ) : (
          <span aria-hidden>{initial}</span>
        )}
      </button>
      {menuOpen ? (
        <>
          <button
            type="button"
            className="fixed inset-0 z-30 cursor-default"
            aria-label="Close menu"
            onClick={() => setMenuOpen(false)}
          />
          <div
            role="menu"
            className="absolute right-0 z-40 mt-2 min-w-[11rem] rounded-md border border-[var(--wine-deep)]/90 bg-[var(--void)]/95 py-1 shadow-lg backdrop-blur-md"
          >
            <p className="border-b border-[var(--wine-deep)]/60 px-3 py-2 text-xs text-[var(--mist)]">
              <span className="block truncate font-medium text-[var(--parchment)]">
                {label}
              </span>
            </p>
            <Link
              href="/profile"
              role="menuitem"
              className="block px-3 py-2 text-sm text-[var(--parchment)] hover:bg-[var(--wine)]/50"
              onClick={() => setMenuOpen(false)}
            >
              Profile
            </Link>
            <Link
              href={`/u/${user.id}`}
              role="menuitem"
              className="block px-3 py-2 text-sm text-[var(--mist)] hover:bg-[var(--wine)]/50"
              onClick={() => setMenuOpen(false)}
            >
              Public link
            </Link>
            <button
              type="button"
              role="menuitem"
              className="w-full px-3 py-2 text-left text-sm text-[var(--parchment)] hover:bg-[var(--wine)]/50"
              onClick={async () => {
                setMenuOpen(false);
                await signOut();
              }}
            >
              Sign out
            </button>
          </div>
        </>
      ) : null}
    </div>
  );
}

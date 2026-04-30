"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils/cn";

const navGroups = [
  {
    label: "Play",
    links: [
      { href: "/single", label: "Single Player" },
      { href: "/competitive", label: "Multiplayer" },
      { href: "/coop", label: "Co-op" },
      { href: "/challenge", label: "Challenge" },
    ],
  },
  {
    label: "Account",
    links: [
      { href: "/stats", label: "Stats" },
      { href: "/leaderboard", label: "Leaderboard" },
      { href: "/profile", label: "Profile" },
    ],
  },
] as const;

export function MobileNav() {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

  // Close menu on navigation
  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  // Prevent body scroll when menu is open
  useEffect(() => {
    if (open) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="relative z-10 flex h-9 w-9 items-center justify-center rounded-md text-[var(--parchment-dim)] transition-colors hover:bg-[var(--wine)]/40 hover:text-[var(--gold-bright)] lg:hidden"
        aria-label={open ? "Close navigation" : "Open navigation"}
        aria-expanded={open}
        aria-haspopup="true"
      >
        {open ? (
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={2}
            className="h-5 w-5"
            aria-hidden
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        ) : (
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={2}
            className="h-5 w-5"
            aria-hidden
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        )}
      </button>

      {open && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 z-30 bg-black/30 backdrop-blur-[1px]"
            onClick={() => setOpen(false)}
            aria-hidden
          />

          {/* Slide-down panel — positioned relative to header (header has `relative`) */}
          <nav
            aria-label="Mobile navigation"
            className={cn(
              "absolute left-0 right-0 top-full z-40",
              "border-b border-[var(--wine-deep)]/80",
              "bg-gradient-to-b from-[var(--void)]/98 to-[var(--plum)]/96",
              "shadow-[0_20px_48px_rgba(0,0,0,0.65)] backdrop-blur-md",
            )}
          >
            <div className="mx-auto max-w-6xl px-4 py-4">
              {navGroups.map((group, gi) => (
                <div key={group.label} className={cn(gi > 0 && "mt-3 border-t border-[var(--wine-deep)]/40 pt-3")}>
                  <p className="mb-2 px-1 text-[0.6rem] font-semibold uppercase tracking-[0.18em] text-[var(--mist)]/60">
                    {group.label}
                  </p>
                  <div className="grid grid-cols-2 gap-1.5">
                    {group.links.map(({ href, label }) => {
                      const active = pathname === href || pathname.startsWith(href + "/");
                      return (
                        <Link
                          key={href}
                          href={href}
                          className={cn(
                            "rounded-lg px-3 py-3.5 text-sm font-medium transition-colors",
                            active
                              ? "bg-[var(--wine)]/60 text-[var(--gold-bright)]"
                              : "text-[var(--parchment)] hover:bg-[var(--wine)]/40 hover:text-[var(--gold-bright)] active:bg-[var(--wine)]/60",
                          )}
                        >
                          {label}
                        </Link>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </nav>
        </>
      )}
    </>
  );
}

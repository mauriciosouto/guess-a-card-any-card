import Link from "next/link";
import { GameLogo } from "@/components/brand/game-logo";
import { MobileNav } from "@/components/layout/mobile-nav";
import { SiteHeaderAuth } from "@/components/auth/site-header-auth";
import { cn } from "@/lib/utils/cn";

const mainModes = [
  { href: "/single", label: "Single" },
  { href: "/competitive", label: "Multiplayer" },
  { href: "/coop", label: "Co-op" },
  { href: "/challenge", label: "Challenge" },
] as const;

const accountLinks = [
  { href: "/stats", label: "Stats" },
  { href: "/leaderboard", label: "Leaderboard" },
  { href: "/profile", label: "Profile" },
] as const;

export function SiteHeader() {
  return (
    <header className="relative z-20 border-b border-[var(--wine-deep)]/80 bg-gradient-to-b from-[var(--void)]/95 via-[var(--plum)]/90 to-[var(--void)]/85 shadow-[0_8px_32px_rgba(0,0,0,0.45)] backdrop-blur-md">
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-[var(--gold)]/35 to-transparent" />
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-2 px-4 py-3 lg:gap-6 lg:px-6">
        {/* Logo */}
        <div className="flex shrink-0 items-center justify-start">
          <GameLogo placement="header" />
        </div>

        {/* Desktop nav — game modes (hidden below lg) */}
        <nav
          className="hidden min-w-0 flex-1 items-center justify-center gap-1 lg:flex"
          aria-label="Game modes"
        >
          {mainModes.map(({ href, label }) => (
            <Link
              key={href}
              href={href}
              className={cn(
                "font-display relative px-3 py-2 text-xs font-semibold uppercase tracking-[0.14em] text-[var(--parchment-dim)] transition-colors duration-300",
                "hover:text-[var(--gold-bright)]",
                "after:absolute after:inset-x-2 after:bottom-0 after:h-px after:origin-center after:scale-x-0 after:bg-gradient-to-r after:from-transparent after:via-[var(--gold)]/70 after:to-transparent after:transition-transform after:duration-300 hover:after:scale-x-100",
              )}
            >
              {label}
            </Link>
          ))}
        </nav>

        {/* Right side */}
        <div className="flex shrink-0 items-center justify-end gap-2 lg:gap-3">
          {/* Desktop account links (hidden below lg) */}
          {accountLinks.map(({ href, label }) => (
            <Link
              key={href}
              href={href}
              className="hidden rounded-md px-2 py-1.5 text-xs text-[var(--mist)] transition-colors hover:bg-[var(--wine)]/40 hover:text-[var(--parchment)] lg:inline-block"
            >
              {label}
            </Link>
          ))}

          {/* Auth (always visible) */}
          <SiteHeaderAuth />

          {/* Mobile hamburger (hidden on sm+) */}
          <MobileNav />
        </div>
      </div>
    </header>
  );
}

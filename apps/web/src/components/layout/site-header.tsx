import Link from "next/link";
import { GameLogo } from "@/components/brand/game-logo";
import { cn } from "@/lib/utils/cn";

const mainModes = [
  { href: "/single", label: "Single" },
  { href: "/competitive", label: "Multiplayer" },
  { href: "/coop", label: "Co-op" },
  { href: "/challenge", label: "Challenge" },
] as const;

const accountLinks = [
  { href: "/stats", label: "Stats" },
  { href: "/profile", label: "Profile" },
] as const;

export function SiteHeader() {
  return (
    <header className="relative z-20 border-b border-[var(--wine-deep)]/80 bg-gradient-to-b from-[var(--void)]/95 via-[var(--plum)]/90 to-[var(--void)]/85 shadow-[0_8px_32px_rgba(0,0,0,0.45)] backdrop-blur-md">
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-[var(--gold)]/35 to-transparent" />
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-2 px-4 py-3 sm:gap-6 sm:px-6">
        <div className="flex shrink-0 items-center justify-start">
          <GameLogo placement="header" />
        </div>

        <nav
          className="flex min-w-0 flex-1 items-center justify-center gap-0.5 overflow-x-auto max-sm:overflow-x-visible sm:gap-1"
          aria-label="Game modes"
        >
          {mainModes.map(({ href, label }) => (
            <Link
              key={href}
              href={href}
              className={cn(
                "font-display relative px-1.5 py-2 text-[0.7rem] font-semibold uppercase tracking-[0.1em] text-[var(--parchment-dim)] transition-colors duration-300 sm:px-3 sm:tracking-[0.14em] sm:text-xs",
                "hover:text-[var(--gold-bright)]",
                "after:absolute after:inset-x-2 after:bottom-0 after:h-px after:origin-center after:scale-x-0 after:bg-gradient-to-r after:from-transparent after:via-[var(--gold)]/70 after:to-transparent after:transition-transform after:duration-300 hover:after:scale-x-100",
              )}
            >
              {href === "/competitive" ? (
                <span className="flex flex-col items-center gap-0 text-center leading-[1.05] sm:inline sm:leading-normal">
                  <span className="sm:inline">Multi</span>
                  <span className="sm:inline">player</span>
                </span>
              ) : (
                label
              )}
            </Link>
          ))}
        </nav>

        <div className="flex shrink-0 items-center justify-end gap-2 sm:gap-3">
          {accountLinks.map(({ href, label }) => (
            <Link
              key={href}
              href={href}
              className="hidden rounded-md px-2 py-1.5 text-xs text-[var(--mist)] transition-colors hover:bg-[var(--wine)]/40 hover:text-[var(--parchment)] sm:inline-block"
            >
              {label}
            </Link>
          ))}
          <Link
            href="/profile"
            className={cn(
              "flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full border-2 border-[var(--gold)]/45 bg-[var(--plum-mid)]/80 text-xs font-semibold uppercase text-[var(--gold-bright)] shadow-[0_0_16px_rgba(201,162,39,0.2)] transition-[box-shadow,transform,border-color] duration-300 hover:scale-[1.03] hover:border-[var(--gold-bright)]/65 hover:shadow-[0_0_24px_rgba(201,162,39,0.35)]",
            )}
            aria-label="Open profile"
          >
            <span className="select-none" aria-hidden>
              ★
            </span>
          </Link>
        </div>
      </div>
    </header>
  );
}

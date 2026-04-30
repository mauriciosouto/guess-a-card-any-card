import Link from "next/link";
import Image from "next/image";
import { GameLogo } from "@/components/brand/game-logo";
import { Button } from "@/components/ui/button";
import { Panel } from "@/components/ui/panel";
import { FaqAccordion } from "@/components/home/faq-accordion";
import { cn } from "@/lib/utils/cn";

// ─── Data ────────────────────────────────────────────────────────────────────

const HOW_TO_PLAY = [
  {
    step: "01",
    title: "A card is hidden",
    imageSrc: "/images/onboarding/step-1.jpg",
    body: "Only a fraction of the card is visible at the start — no art, no name, no stats.",
  },
  {
    step: "02",
    title: "Clues appear step by step",
    imageSrc: "/images/onboarding/step-2.jpg",
    // "Guess at any time" was too broad — you get one attempt per step, so this is more precise:
    body: "Each step uncovers a new clue: art, card type, cost, pitch, attack and defense. Guess at any step — or wait for more.",
  },
  {
    step: "03",
    title: "Solve before the final reveal",
    imageSrc: "/images/onboarding/step-3.jpg",
    body: "Fewer attempts and earlier guesses earn better results. Running out of attempts counts as a loss.",
  },
] as const;

const GAME_MODES = [
  {
    href: "/single",
    badge: "Solo",
    tagline: "Practice and sharpen your reads",
    body: "Face the veil alone. No pressure, no timer — just you and the card.",
    cta: "Play solo",
  },
  {
    href: "/challenge",
    badge: "Challenge",
    tagline: "Dare someone with a specific card",
    body: "Pick any card, share the link, and see if they can identify it cold.",
    cta: "Send a challenge",
  },
  {
    href: "/coop",
    badge: "Co-op",
    tagline: "Solve it together as a team",
    body: "A shared pool of guesses passed hand to hand — your team works as one.",
    cta: "Play co-op",
  },
  {
    href: "/competitive",
    badge: "Multiplayer",
    tagline: "Race to identify it first",
    body: "Same card, same reveals, first correct answer wins. Fastest mind takes the round.",
    cta: "Play vs others",
  },
] as const;

const ACCOUNT_BENEFITS = [
  {
    icon: "📊",
    title: "Track your stats",
    body: "Win rate, average attempts, best times — see how your reads improve.",
  },
  {
    icon: "🏆",
    title: "Leaderboard",
    body: "Compete globally. Top readers ranked by performance across all modes.",
  },
  {
    icon: "👤",
    title: "Public profile",
    body: "Share your results and achievements via a public URL.",
  },
  {
    icon: "🎯",
    title: "Challenge history",
    body: "Full record of challenges sent and received, with outcome details.",
  },
] as const;

const FAQ = [
  {
    q: "Do I need an account?",
    a: "No. You can play all modes as a guest instantly. Creating an account adds stats tracking, leaderboard access, and a public profile.",
  },
  {
    q: "Is this an official Flesh and Blood product?",
    a: "No. Guess a Card, Any Card is an independent fan-made project created for the community. It is not affiliated with, endorsed by, or sponsored by Legend Story Studios® or Flesh and Blood™. All official card names, artwork, and related assets remain the property of their respective owners.",
  },
  {
    q: "How many guesses do I get?",
    a: "One guess per reveal step. Each step uncovers more of the card. Miss until the final reveal and the run ends. Fewer guesses used means a better result.",
  },
  {
    q: "What affects my score?",
    a: "Number of attempts used and time taken. Earlier correct guesses give better results. Skipping or running out counts as a loss.",
  },
  {
    q: "What counts on the leaderboard?",
    a: "Registered users only. Ranked by win rate, then average attempts to win, then average time.",
  },
  {
    q: "Can I challenge a friend with a specific card?",
    a: "Yes. When creating a challenge you can pick a specific card, or let the game choose one randomly from your selected sets.",
  },
  {
    q: "Does abandoning a game count as a loss?",
    a: "Leaving without a correct guess records a loss for registered users. Guest sessions are not tracked.",
  },
  {
    q: "Are all Flesh and Blood cards included?",
    a: "Cards from all main sets are included. Tokens, promo-only printings, and Marvel variants are excluded to keep the catalog clean.",
  },
  {
    q: "Can I play on mobile?",
    a: "Yes. The game is fully playable in mobile browsers — the interface adapts to smaller screens.",
  },
] as const;

// ─── Shared helpers ───────────────────────────────────────────────────────────

function SectionDivider({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-4" aria-hidden>
      <div className="h-px flex-1 bg-gradient-to-r from-transparent to-[var(--gold-dim)]/25" />
      <span className="font-display text-[0.58rem] font-semibold uppercase tracking-[0.32em] text-[var(--gold-dim)]/80">
        {children}
      </span>
      <div className="h-px flex-1 bg-gradient-to-l from-transparent to-[var(--gold-dim)]/25" />
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function HomePage() {
  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-20 px-4 pb-24 pt-0 sm:gap-24 sm:px-6">

      {/* ── 1. HERO ──────────────────────────────────────────────────────────── */}
      <section
        className="flex flex-col items-center gap-6 pt-4 text-center sm:pt-10"
        aria-labelledby="hero-heading"
      >
        {/* Ambient glow + logo */}
        <div className="relative w-full max-w-xl">
          <div
            className="pointer-events-none absolute inset-0 opacity-60 blur-[64px]"
            aria-hidden
          >
            <div className="mx-auto h-44 rounded-full bg-[var(--gold)]/10" />
          </div>
          <GameLogo
            placement="hero"
            className="relative z-[1] drop-shadow-[0_12px_48px_rgba(0,0,0,0.7)]"
          />
        </div>

        {/* Headline + subtitle */}
        <div className="flex flex-col items-center gap-3">
          <h1
            id="hero-heading"
            className="font-display max-w-lg text-3xl font-bold tracking-tight text-[var(--gold-bright)] sm:text-4xl"
          >
            Guess the Card. Any Card.
          </h1>
          <p className="max-w-md text-sm leading-relaxed text-[var(--parchment-dim)] sm:text-base">
            Reveal clues step by step and identify the Flesh and Blood card
            before the final reveal.
          </p>
        </div>

        {/* CTAs — primary action clearly first, secondary clearly subordinate */}
        <div className="flex flex-col items-center gap-3">
          <Button asChild size="lg" className="w-full max-w-xs sm:w-auto">
            <Link href="/single">Play Solo</Link>
          </Button>
          <Link
            href="/challenge"
            className="text-xs text-[var(--mist)] underline-offset-2 transition-colors hover:text-[var(--parchment)] hover:underline"
          >
            or Challenge a Friend →
          </Link>
        </div>

        <p className="text-xs text-[var(--mist)]">
          No account required — play as a guest instantly.
        </p>
      </section>

      {/* ── 2. HOW TO PLAY ───────────────────────────────────────────────────── */}
      <section aria-labelledby="how-to-play-heading" className="flex flex-col gap-8">
        <SectionDivider>How to Play</SectionDivider>

        <h2 id="how-to-play-heading" className="sr-only">
          How to Play
        </h2>

        {/* Visual: always 3-col so the progression is immediately obvious on any screen */}
        <div className="grid grid-cols-3 gap-3 sm:gap-6">
          {HOW_TO_PLAY.map(({ step, imageSrc }) => (
            <div key={step} className="flex flex-col items-center gap-2">
              <span className="font-display text-[0.52rem] font-semibold uppercase tracking-[0.3em] text-[var(--gold-dim)] sm:text-[0.58rem]">
                Step {step}
              </span>
              <Image
                src={imageSrc}
                alt=""
                width={630}
                height={880}
                className="h-auto w-full overflow-hidden rounded-xl border-2 border-[var(--gold)]/30 object-cover shadow-[0_8px_24px_rgba(0,0,0,0.75)]"
                sizes="(max-width: 640px) 30vw, 180px"
                aria-hidden
              />
            </div>
          ))}
        </div>

        {/* Descriptions: stacked on mobile, 3-col on sm+ */}
        <div className="grid gap-4 sm:grid-cols-3">
          {HOW_TO_PLAY.map(({ step, title, body }) => (
            <div key={step} className="flex flex-col gap-1.5">
              <h3 className="font-display text-sm font-semibold tracking-[0.08em] text-[var(--gold-bright)]">
                {title}
              </h3>
              <p className="text-xs leading-relaxed text-[var(--parchment-dim)]">{body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── 3. GAME MODES ────────────────────────────────────────────────────── */}
      <section aria-labelledby="modes-heading" className="flex flex-col gap-8">
        <SectionDivider>Game Modes</SectionDivider>

        <h2 id="modes-heading" className="sr-only">
          Game Modes
        </h2>

        <div className="grid gap-4 sm:grid-cols-2">
          {GAME_MODES.map(({ href, badge, tagline, body, cta }) => (
            <Panel
              key={href}
              variant="textured"
              className={cn(
                "flex flex-col gap-3 border-[var(--gold)]/15 p-5",
                "transition-[border-color,transform,box-shadow] duration-300",
                "hover:-translate-y-0.5 hover:border-[var(--gold)]/35 hover:shadow-[0_0_32px_rgba(201,162,39,0.1)]",
              )}
            >
              <div>
                <p className="font-display text-[0.58rem] font-semibold uppercase tracking-[0.28em] text-[var(--gold-dim)]">
                  {badge}
                </p>
                <h3 className="font-display mt-0.5 text-base font-semibold tracking-[0.06em] text-[var(--gold-bright)]">
                  {tagline}
                </h3>
              </div>
              <p className="text-sm leading-relaxed text-[var(--parchment-dim)]">{body}</p>
              <Link
                href={href}
                className="mt-auto inline-flex items-center gap-1.5 font-display text-[0.63rem] font-semibold uppercase tracking-[0.22em] text-[var(--gold-dim)] transition-colors hover:text-[var(--gold)]"
              >
                {cta} <span aria-hidden>→</span>
              </Link>
            </Panel>
          ))}
        </div>
      </section>

      {/* ── 4. WHY CREATE AN ACCOUNT ─────────────────────────────────────────── */}
      <section aria-labelledby="account-heading" className="flex flex-col gap-8">
        <SectionDivider>Why Create an Account</SectionDivider>

        <div className="flex flex-col items-center gap-2 text-center">
          <h2
            id="account-heading"
            className="font-display text-xl font-semibold tracking-[0.08em] text-[var(--parchment)]"
          >
            Your results, saved and ranked
          </h2>
          <p className="max-w-md text-sm leading-relaxed text-[var(--parchment-dim)]">
            Guest mode is always available. An account adds persistence, rankings, and history.
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {ACCOUNT_BENEFITS.map(({ icon, title, body }) => (
            <Panel key={title} variant="subtle" className="flex flex-col gap-2.5 p-4">
              <span className="text-2xl leading-none" aria-hidden>
                {icon}
              </span>
              <h3 className="font-display text-sm font-semibold tracking-[0.08em] text-[var(--parchment)]">
                {title}
              </h3>
              <p className="text-xs leading-relaxed text-[var(--parchment-dim)]">{body}</p>
            </Panel>
          ))}
        </div>

        <div className="flex flex-col items-center gap-2 text-center">
          <Button variant="outline" asChild size="md">
            <Link href="/login">Create a free account</Link>
          </Button>
          <p className="text-xs text-[var(--mist)]">
            Or keep playing as a guest — no sign-up needed.
          </p>
        </div>
      </section>

      {/* ── 5. FAQ ───────────────────────────────────────────────────────────── */}
      <section aria-labelledby="faq-heading" className="flex flex-col gap-8">
        <SectionDivider>FAQ</SectionDivider>

        <h2
          id="faq-heading"
          className="text-center font-display text-xl font-semibold tracking-[0.08em] text-[var(--parchment)]"
        >
          Common questions
        </h2>

        <FaqAccordion items={FAQ} />

        {/* Closing CTA — gives users a clear next action after reading the FAQ */}
        <div className="flex flex-col items-center gap-4 border-t border-[var(--wine-deep)]/40 pt-8 text-center">
          <p className="font-display text-base font-semibold tracking-[0.08em] text-[var(--parchment)]">
            Ready to test your reads?
          </p>
          <p className="text-sm text-[var(--parchment-dim)]">
            The best way to learn is to play.
          </p>
          <div className="flex flex-col items-center gap-3">
            <Button asChild size="lg" className="w-full max-w-xs sm:w-auto">
              <Link href="/single">Play Solo</Link>
            </Button>
            <Link
              href="/challenge"
              className="text-xs text-[var(--mist)] underline-offset-2 transition-colors hover:text-[var(--parchment)] hover:underline"
            >
              or Challenge a Friend →
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}

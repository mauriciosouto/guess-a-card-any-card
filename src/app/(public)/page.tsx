import Link from "next/link";
import { GameLogo } from "@/components/brand/game-logo";
import { siteConfig } from "@/lib/config/site";
import { Button } from "@/components/ui/button";
import { Panel } from "@/components/ui/panel";

const modes = [
  {
    href: "/single",
    title: "Solitary reading",
    body: "One guess per veil. Unmask the card before the last truth is shown.",
  },
  {
    href: "/competitive",
    title: "Rival auguries",
    body: "One table, one omen — who names it in fewer whispers and lesser time?",
  },
  {
    href: "/coop",
    title: "Circle of seers",
    body: "A single thread of guesses, passed hand to hand along the ritual.",
  },
  {
    href: "/challenge",
    title: "Binding a rival",
    body: "Choose the sigil and dare another soul to read it cold.",
  },
] as const;

export default function HomePage() {
  return (
    <div className="flex min-h-[70vh] flex-col items-center gap-8 px-0 pb-8 pt-0 sm:gap-12 sm:pb-10">
      <section
        className="flex w-full flex-col items-center gap-4 text-center sm:gap-5"
        aria-labelledby="hero-logo"
      >
        <h1 id="hero-logo" className="sr-only">
          {siteConfig.name}
        </h1>
        <div className="relative w-full px-1 sm:px-2">
          <div className="pointer-events-none absolute inset-0 opacity-[0.65] blur-[50px] sm:blur-[70px]" aria-hidden>
            <div className="mx-auto h-36 max-w-xl rounded-full bg-[var(--gold)]/15 sm:h-44 md:h-52" />
          </div>
          <GameLogo
            placement="hero"
            className="relative z-[1] drop-shadow-[0_12px_48px_rgba(0,0,0,0.65)]"
          />
        </div>
        <p className="font-display max-w-lg px-2 text-[0.7rem] font-semibold uppercase tracking-[0.35em] text-[var(--gold-dim)] sm:text-xs">
          Veiled cards · Flesh and Blood spirit
        </p>
        <p className="max-w-xl px-2 text-sm leading-relaxed text-[var(--parchment-dim)] sm:text-base">
          {siteConfig.description}
        </p>
        <div className="flex flex-col items-stretch gap-3 px-2 sm:flex-row sm:justify-center">
          <Button asChild size="lg">
            <Link href="/single">Enter the veil</Link>
          </Button>
          <Button variant="outline" asChild size="lg">
            <Link href="/stats">Chronicles</Link>
          </Button>
        </div>
        <p className="max-w-md px-2 text-[0.7rem] leading-relaxed text-[var(--mist)]">
          Oaths of identity are optional — when you bind an account, your victories echo in the
          archives.
        </p>
      </section>

      <section className="grid w-full max-w-4xl gap-4 sm:grid-cols-2">
        {modes.map((m) => (
          <Link key={m.href} href={m.href} className="group block">
            <Panel
              variant="textured"
              className="h-full border-[var(--gold)]/15 p-5 transition-[transform,box-shadow,border-color] duration-300 group-hover:-translate-y-0.5 group-hover:border-[var(--gold)]/35 group-hover:shadow-[0_0_32px_rgba(201,162,39,0.15)]"
            >
              <h2 className="font-display text-base font-semibold tracking-[0.12em] text-[var(--gold-bright)] group-hover:text-[var(--gold-bright)]">
                {m.title}
              </h2>
              <p className="mt-3 text-sm leading-relaxed text-[var(--parchment-dim)]">{m.body}</p>
              <span className="mt-4 inline-block font-display text-[0.65rem] font-semibold uppercase tracking-[0.28em] text-[var(--gold-dim)] transition-colors group-hover:text-[var(--gold)]">
                Cross the threshold →
              </span>
            </Panel>
          </Link>
        ))}
      </section>
    </div>
  );
}

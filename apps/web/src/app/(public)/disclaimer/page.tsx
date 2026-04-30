import type { Metadata } from "next";

export const metadata: Metadata = {
  title: {
    absolute: "Disclaimer | Guess a Card, Any Card",
  },
  description:
    "Fan-made community project disclaimer for Guess a Card, Any Card. Learn about project ownership, community purpose, and intellectual property attribution related to Flesh and Blood.",
  openGraph: {
    title: "Disclaimer | Guess a Card, Any Card",
    description:
      "Fan-made community project disclaimer for Guess a Card, Any Card. Learn about project ownership, community purpose, and intellectual property attribution related to Flesh and Blood.",
    type: "website",
  },
};

export default function DisclaimerPage() {
  return (
    <div className="mx-auto w-full max-w-3xl px-4 pb-16 pt-4 sm:px-6 sm:pt-8">
      <div className="rounded-xl border border-[var(--wine-deep)]/55 bg-[var(--void)]/35 p-5 sm:p-7">
        <h1 className="font-display text-2xl font-semibold tracking-[0.08em] text-[var(--gold-bright)] sm:text-3xl">
          Disclaimer
        </h1>

        <div className="mt-5 space-y-4 text-sm leading-relaxed text-[var(--parchment-dim)] sm:text-[0.95rem]">
          <p>
            Guess a Card, Any Card is an independent, fan-made project created for the Flesh and
            Blood community.
          </p>

          <p>
            This website is not affiliated with, endorsed by, sponsored by, or officially connected
            to Legend Story Studios® (LSS), Flesh and Blood™, or any of their subsidiaries,
            licensors, or partners.
          </p>

          <p>
            Legend Story Studios®, Flesh and Blood™, hero names, set names, logos, card names,
            artwork, and all related intellectual property are the property of their respective
            owners.
          </p>

          <p>
            Card images and related assets displayed on this site are used for informational,
            gameplay-reference, educational, and community purposes only. No ownership is claimed
            over any official game assets, trademarks, or artwork.
          </p>

          <p>
            This project exists solely to help players enjoy, learn, and engage with the game
            through card recognition, challenge modes, statistics, and community-driven features.
          </p>

          <p>
            If you are a rights holder and believe any content should be credited differently,
            modified, or removed, please make contact via our{" "}
            <a
              href="https://github.com/mauriciosouto/guess-a-card-any-card"
              target="_blank"
              rel="noopener noreferrer"
              className="text-[var(--parchment)] underline underline-offset-2 transition-colors hover:text-[var(--gold-bright)]"
            >
              public GitHub repository
            </a>{" "}
            and we will act in good faith to resolve the issue promptly.
          </p>

          <p>
            Our goal is to celebrate and support the Flesh and Blood community while respecting the
            work and intellectual property of Legend Story Studios and all original creators.
          </p>
        </div>
      </div>
    </div>
  );
}

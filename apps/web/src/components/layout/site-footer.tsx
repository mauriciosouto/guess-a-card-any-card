import Link from "next/link";

export function SiteFooter() {
  return (
    <footer className="border-t border-[var(--wine-deep)]/45 bg-[var(--void)]/30">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-2 px-4 py-4 text-center sm:px-6">
        <p className="text-[0.69rem] leading-relaxed text-[var(--mist)]/90">
          Guess a Card, Any Card is a fan-made community project and is not affiliated with,
          endorsed by, or sponsored by Legend Story Studios® or Flesh and Blood™. All card names,
          artwork, and related intellectual property belong to their respective owners.
        </p>
        <p className="text-[0.66rem] text-[var(--mist)]/80">
          <Link
            href="/disclaimer"
            className="underline-offset-2 transition-colors hover:text-[var(--parchment)] hover:underline"
          >
            Disclaimer
          </Link>
        </p>
      </div>
    </footer>
  );
}

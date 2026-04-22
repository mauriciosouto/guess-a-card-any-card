import Link from "next/link";
import { RouteShell } from "@/components/layout/route-shell";
import { EmptyStateWell } from "@/components/ui/empty-state";

export default function StatsPage() {
  return (
    <RouteShell
      title="Chronicles"
      description="Veils lifted, names spoken true, and the cards that favored or resisted you — drawn from your living archive in the well."
    >
      <EmptyStateWell
        title="The chronicle is not yet written here"
        description="This page will grow with deeper history, trends, and tales from your runs. For now, your lifetime tallies and recent games live on your profile — keep playing to give the archive something to remember."
      >
        <Link
          href="/profile"
          className="rounded-md border border-[var(--gold-dim)]/35 px-3 py-1.5 text-xs font-medium text-[var(--gold-bright)] transition-colors hover:border-[var(--gold)]/55 hover:text-[var(--parchment)]"
        >
          Open profile
        </Link>
        <Link
          href="/single"
          className="rounded-md px-3 py-1.5 text-xs text-[var(--mist)] hover:text-[var(--parchment)]"
        >
          Start a reading
        </Link>
      </EmptyStateWell>
    </RouteShell>
  );
}

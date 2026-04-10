import Link from "next/link";
import { RouteShell } from "@/components/layout/route-shell";
import { PlayerStatusList } from "@/components/game/PlayerStatusList";
import { TimerBar } from "@/components/game/TimerBar";
import { Button } from "@/components/ui/button";

export default function CompetitivePage() {
  return (
    <RouteShell
      title="Rival auguries"
      description="Every soul beholds the same veil. When all have sealed their guess — or the hourglass empties — the next truth is shown. Wired when the rite reaches your room."
    >
      <div className="flex flex-col gap-6 max-lg:min-h-[min(70vh,560px)]">
        <div className="flex-1 space-y-4">
          <TimerBar fractionRemaining={1} />
          <PlayerStatusList players={[]} />
        </div>
        <div className="mt-auto flex flex-col gap-2 border-t border-[var(--gold)]/10 pt-4 lg:mt-0 lg:flex-shrink-0">
          <Button asChild variant="outline" size="sm">
            <Link href="/">Leave</Link>
          </Button>
          <Button type="button" variant="secondary" size="sm" disabled className="opacity-50">
            End game (host)
          </Button>
        </div>
      </div>
    </RouteShell>
  );
}

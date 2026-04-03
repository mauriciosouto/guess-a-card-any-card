import { RouteShell } from "@/components/layout/route-shell";
import { PlayerStatusList } from "@/components/game/PlayerStatusList";
import { TimerBar } from "@/components/game/TimerBar";

export default function CompetitivePage() {
  return (
    <RouteShell
      title="Rival auguries"
      description="Every soul beholds the same veil. When all have sealed their guess — or the hourglass empties — the next truth is shown. Wired when the rite reaches your room."
    >
      <div className="space-y-4">
        <TimerBar fractionRemaining={1} />
        <PlayerStatusList players={[]} />
      </div>
    </RouteShell>
  );
}

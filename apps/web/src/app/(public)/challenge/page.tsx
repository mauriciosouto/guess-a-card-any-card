import { RouteShell } from "@/components/layout/route-shell";
import { ChallengeHostClient } from "./challenge-host-client";

export default function ChallengePage() {
  return (
    <RouteShell
      title="Binding a rival"
      description="Pick one card, share one link. They play the same reading as single player; you see the outcome here when they’re done."
      className="max-w-3xl"
    >
      <ChallengeHostClient />
    </RouteShell>
  );
}


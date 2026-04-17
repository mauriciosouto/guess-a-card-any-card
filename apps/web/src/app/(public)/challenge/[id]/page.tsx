import { RouteShell } from "@/components/layout/route-shell";
import { ChallengePlayClient } from "./challenge-play-client";

export default async function ChallengePlayPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return (
    <RouteShell
      title="Bound challenge"
      description="One run, one link — name the host’s card before your steps run out."
      className="max-w-5xl"
    >
      <ChallengePlayClient challengeId={id} />
    </RouteShell>
  );
}

import { RouteShell } from "@/components/layout/route-shell";
import { SinglePlayerClient } from "./single-player-client";

export default function SinglePlayerPage() {
  return (
    <RouteShell
      title="Solitary reading"
      description="Bind the omen to chosen sigils if you wish—each veil allows but one naming. Divine the card before your allotted attempts are spent."
      className="max-w-5xl"
    >
      <SinglePlayerClient />
    </RouteShell>
  );
}

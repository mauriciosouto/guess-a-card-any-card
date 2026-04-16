import { RevealEngineDebugPreview } from "@/components/dev/reveal-engine-debug-preview";
import { RouteShell } from "@/components/layout/route-shell";

export default function DevRevealPreviewPage() {
  return (
    <RouteShell
      title="Reveal engine preview"
      description="New reveal pipeline: getRevealStateAtStep → getRenderRegionsFromRevealState (plan blackouts + always-hidden name/footer). Does not affect live gameplay."
    >
      <RevealEngineDebugPreview />
    </RouteShell>
  );
}

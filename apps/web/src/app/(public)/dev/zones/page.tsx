import { ZoneDebugCanvas } from "@/components/dev/zone-debug-canvas";
import { RouteShell } from "@/components/layout/route-shell";

export default function DevZonesPage() {
  return (
    <RouteShell
      title="Zone geometry"
      description="Debug view of candidate zones from apps/web/src/config/cardTemplates.ts — no reveal ordering, static layout only."
    >
      <ZoneDebugCanvas />
    </RouteShell>
  );
}

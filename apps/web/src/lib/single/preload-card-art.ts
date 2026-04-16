/**
 * Decode card bitmap off the critical path. Same `imageUrl` is reused every step;
 * repeats are cheap (browser cache); first run improves StepCardPreview readiness.
 */
export function scheduleCardArtPreload(imageUrl: string | null | undefined): void {
  if (typeof window === "undefined") return;
  const url = imageUrl?.trim();
  if (!url) return;

  const run = () => {
    const img = new Image();
    const el = img as HTMLImageElement & { fetchPriority?: string };
    if ("fetchPriority" in el) el.fetchPriority = "low";
    img.src = url;
  };

  if (typeof window.requestIdleCallback === "function") {
    window.requestIdleCallback(() => run(), { timeout: 1500 });
  } else {
    setTimeout(run, 0);
  }
}

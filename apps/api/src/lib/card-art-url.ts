/**
 * Resolve FAB package image keys (e.g. `KSU15.width-450`) to a public art URL.
 * Override base with `FAB_CARD_IMAGE_BASE_URL` if your deployment uses a different CDN.
 */
export function resolveFabCardArtUrl(imageKey: string): string {
  const k = imageKey.trim();
  if (!k) return "";
  if (/^https?:\/\//i.test(k)) return k;
  const base = (
    process.env.FAB_CARD_IMAGE_BASE_URL ?? "https://storage.googleapis.com/fabmaster/media/images"
  ).replace(/\/$/, "");
  const file =
    k.includes(".width-") || k.endsWith(".png") || k.endsWith(".webp") ? `${k}.png` : `${k}.width-450.png`;
  return `${base}/${file}`;
}

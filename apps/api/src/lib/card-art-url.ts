import type { Printing } from "@flesh-and-blood/types";

const DEFAULT_FAB_IMAGE_BASE = "https://storage.googleapis.com/fabmaster/media/images";

/**
 * Resolve FAB package image keys (e.g. `KSU15.width-450`) to a public art URL.
 * Override base with `FAB_CARD_IMAGE_BASE_URL` if your deployment uses a different CDN.
 * Empty string in the env is ignored so the default base is still used.
 */
export function resolveFabCardArtUrl(imageKey: string): string {
  const k = imageKey.trim();
  if (!k) return "";
  if (/^https?:\/\//i.test(k)) return k;
  const envBase = process.env.FAB_CARD_IMAGE_BASE_URL?.trim();
  const base = (envBase && envBase.length > 0 ? envBase : DEFAULT_FAB_IMAGE_BASE).replace(/\/$/, "");
  const file =
    k.includes(".width-") || k.endsWith(".png") || k.endsWith(".webp") ? `${k}.png` : `${k}.width-450.png`;
  return `${base}/${file}`;
}

/**
 * Hero art for a catalog printing: prefer TCGPlayer's CDN when a product id exists.
 * Many short keys (e.g. `MST131`) do not resolve on fabmaster `media/images`, but TCGPlayer images are broadly available.
 */
export function resolveCatalogCardArtUrl(imageKey: string, printing: Printing): string {
  const pid = printing.tcgplayer?.productId?.trim();
  if (pid) {
    return `https://product-images.tcgplayer.com/fit-in/870x870/${pid}.jpg`;
  }
  return resolveFabCardArtUrl(imageKey);
}

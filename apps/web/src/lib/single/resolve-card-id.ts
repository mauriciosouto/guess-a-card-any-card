"use client";

import { singleFetch } from "@/lib/single/single-api";

/** Exact playable catalog name → stable `cardId`, or null. */
export async function resolveCardIdFromExactName(name: string): Promise<string | null> {
  const trimmed = name.trim();
  if (!trimmed) return null;
  const res = await singleFetch(`/cards/resolve?name=${encodeURIComponent(trimmed)}`);
  if (!res.ok) return null;
  const j = (await res.json()) as { cardId?: string | null };
  return typeof j.cardId === "string" && j.cardId.length > 0 ? j.cardId : null;
}

"use client";

import { buildGameApiRequestHeaders } from "@/lib/auth/game-api-headers";
import type { PublicProfileResponse } from "@/lib/profile/types";

export async function fetchProfileMe(): Promise<PublicProfileResponse> {
  const headers = await buildGameApiRequestHeaders();
  const res = await fetch("/api/profile/me", { headers, cache: "no-store" });
  if (res.status === 401) {
    throw new Error("unauthorized");
  }
  if (!res.ok) {
    const t = await res.text();
    throw new Error(t || `HTTP ${res.status}`);
  }
  return (await res.json()) as PublicProfileResponse;
}

export async function fetchPublicProfile(userId: string): Promise<PublicProfileResponse> {
  const res = await fetch(`/api/profile/${encodeURIComponent(userId)}`, {
    cache: "no-store",
  });
  if (res.status === 404) {
    throw new Error("not_found");
  }
  if (!res.ok) {
    const t = await res.text();
    throw new Error(t || `HTTP ${res.status}`);
  }
  return (await res.json()) as PublicProfileResponse;
}

"use client";

import { buildGameApiRequestHeaders } from "@/lib/auth/game-api-headers";
import type { PublicProfileResponse } from "@/lib/profile/types";

function parseApiError(res: Response, body: string): Error {
  if ((res.headers.get("content-type") ?? "").includes("text/html")) {
    return new Error(`API unavailable (${res.status})`);
  }
  return new Error(body || `HTTP ${res.status}`);
}

export async function fetchProfileMe(): Promise<PublicProfileResponse> {
  const headers = await buildGameApiRequestHeaders();
  const res = await fetch("/api/profile/me", { headers, cache: "no-store" });
  if (res.status === 401) {
    throw new Error("unauthorized");
  }
  if (!res.ok) {
    throw parseApiError(res, await res.text());
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
    throw parseApiError(res, await res.text());
  }
  return (await res.json()) as PublicProfileResponse;
}

"use client";

import { buildGameApiRequestHeaders } from "@/lib/auth/game-api-headers";

export async function singleFetch(path: string, init?: RequestInit): Promise<Response> {
  const headers = await buildGameApiRequestHeaders(init?.headers);
  if (init?.body != null && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }
  return fetch(`/api/single${path}`, { ...init, headers });
}

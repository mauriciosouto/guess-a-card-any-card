"use client";

import { useEffect, useState } from "react";
import { fetchPublicProfile } from "@/lib/profile/profile-api";
import type { PublicProfileResponse } from "@/lib/profile/types";
import { ProfileView } from "@/components/profile/profile-view";
import { RouteShell } from "@/components/layout/route-shell";
import Link from "next/link";

type Props = { userId: string };

export function PublicProfileClient({ userId }: Props) {
  const [data, setData] = useState<PublicProfileResponse | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    setErr(null);
    void fetchPublicProfile(userId)
      .then(setData)
      .catch((e: unknown) => {
        if (e instanceof Error && e.message === "not_found") {
          setErr("not_found");
        } else {
          setErr(e instanceof Error ? e.message : "Could not load profile.");
        }
        setData(null);
      })
      .finally(() => setLoading(false));
  }, [userId]);

  if (loading) {
    return (
      <RouteShell title="Player" description="Public stats and history.">
        <p className="text-sm text-[var(--mist)]">Loading…</p>
      </RouteShell>
    );
  }

  if (err === "not_found") {
    return (
      <RouteShell title="Not found" description="This reader is not in the index.">
        <p className="text-sm text-[var(--mist)]">
          No user exists for that link. Return{" "}
          <Link href="/" className="text-[var(--gold-bright)] hover:underline">
            home
          </Link>{" "}
          or start a new reading.
        </p>
      </RouteShell>
    );
  }

  if (err || !data) {
    return (
      <RouteShell title="Profile" description="Could not load.">
        <p className="text-sm text-red-300/90">{err}</p>
      </RouteShell>
    );
  }

  return (
    <RouteShell
      title={data.displayName}
      description="Public stats from completed readings (single, challenge, and more as modes grow)."
    >
      <ProfileView data={data} isOwnProfile={false} />
    </RouteShell>
  );
}

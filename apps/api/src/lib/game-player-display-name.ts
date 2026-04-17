import { prisma } from "@/lib/prisma";
import type { PlayerIdentity } from "@/lib/player-identity";

export class DisplayNameResolutionError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
    this.name = "DisplayNameResolutionError";
  }
}

/** Label stored on `GamePlayer.displayName` — user/guest + local date-time. */
export async function resolveGamePlayerDisplayNameForSession(
  identity: PlayerIdentity,
): Promise<string> {
  const ts = new Intl.DateTimeFormat(undefined, {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date());

  if (identity.userId) {
    const user = await prisma.user.findUnique({
      where: { id: identity.userId },
      select: { displayName: true },
    });
    if (!user) {
      throw new DisplayNameResolutionError(400, "Unknown user id.");
    }
    const label = user.displayName.trim() || identity.userId;
    return `${label} · ${ts}`;
  }

  if (!identity.guestId) {
    throw new DisplayNameResolutionError(400, "Missing player identity.");
  }
  const gid = identity.guestId;
  const idPart = gid.length > 24 ? `${gid.slice(0, 10)}…` : gid;
  return `${idPart} · ${ts}`;
}

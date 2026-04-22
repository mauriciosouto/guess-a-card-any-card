import type { PlayerIdentity } from "@/lib/player-identity";

/**
 * Ownership invariants for persisted rows (enforce in app; optional DB CHECK later):
 * - GamePlayer: exactly one of userId / guestId
 * - Challenge host: exactly one of createdByUserId / createdByGuestId
 */
export class PlayerIdentityPersistenceError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
    this.name = "PlayerIdentityPersistenceError";
  }
}

/**
 * Prisma-ready GamePlayer / challenge-player fields: exactly one id column is non-null.
 *
 * @throws PlayerIdentityPersistenceError when both or neither are set after normalization
 */
export function gamePlayerOwnershipFromIdentity(
  identity: PlayerIdentity,
): { userId: string | null; guestId: string | null } {
  const userId = identity.userId?.trim() || null;
  const guestId = identity.guestId?.trim() || null;

  if (userId && guestId) {
    throw new PlayerIdentityPersistenceError(
      400,
      "Invalid player identity: cannot persist both user and guest on the same row.",
    );
  }
  if (!userId && !guestId) {
    throw new PlayerIdentityPersistenceError(
      400,
      "Invalid player identity: need a signed-in user or a guest id.",
    );
  }

  if (userId) {
    return { userId, guestId: null };
  }
  return { userId: null, guestId: guestId! };
}

/** Challenge host columns: mirrors {@link gamePlayerOwnershipFromIdentity} shape. */
export function challengeHostOwnershipFromIdentity(identity: PlayerIdentity): {
  createdByUserId: string | null;
  createdByGuestId: string | null;
} {
  const o = gamePlayerOwnershipFromIdentity(identity);
  return { createdByUserId: o.userId, createdByGuestId: o.guestId };
}

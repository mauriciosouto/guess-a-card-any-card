import type { PlayerIdentity } from "@/lib/player-identity";

export type UserActor = { kind: "user"; userId: string };
export type GuestActor = { kind: "guest"; guestId: string };
export type Actor = UserActor | GuestActor;

export function actorToPlayerIdentity(actor: Actor): PlayerIdentity {
  if (actor.kind === "user") {
    return { userId: actor.userId, guestId: null };
  }
  return { userId: null, guestId: actor.guestId };
}

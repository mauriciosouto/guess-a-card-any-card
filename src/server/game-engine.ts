/**
 * Mode-specific engines — blueprint §17.
 * COOP: {@link @/server/engines/coop-engine}.
 * Single-player guess resolution: {@link @/lib/game/single-player-logic}.
 */
export { nextActiveRoomPlayerId, shuffleRoomPlayerIds } from "@/server/engines/coop-engine";
export {
  resolveSinglePlayerGuess,
  singlePlayerAttemptCounts,
} from "@/lib/game/single-player-logic";

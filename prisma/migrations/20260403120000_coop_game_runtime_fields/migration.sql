-- Phase 3 COOP: persisted turn + step; host override flag on guesses.
ALTER TABLE "games" ADD COLUMN IF NOT EXISTS "current_step" INTEGER;
ALTER TABLE "games" ADD COLUMN IF NOT EXISTS "active_turn_room_player_id" UUID;
ALTER TABLE "guesses" ADD COLUMN IF NOT EXISTS "submitted_by_host_override" BOOLEAN NOT NULL DEFAULT false;

CREATE INDEX IF NOT EXISTS "games_active_turn_room_player_id_idx" ON "games"("active_turn_room_player_id");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'games_active_turn_room_player_id_fkey'
  ) THEN
    ALTER TABLE "games" ADD CONSTRAINT "games_active_turn_room_player_id_fkey"
      FOREIGN KEY ("active_turn_room_player_id") REFERENCES "room_players"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;

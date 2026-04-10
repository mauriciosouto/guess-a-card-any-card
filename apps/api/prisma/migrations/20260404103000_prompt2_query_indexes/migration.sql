-- Prompt 2 — query-heavy paths (§13.2 + multiplayer lookups).
CREATE INDEX IF NOT EXISTS "room_players_room_id_guest_id_idx" ON "room_players"("room_id", "guest_id");

CREATE INDEX IF NOT EXISTS "game_players_game_id_room_player_id_idx" ON "game_players"("game_id", "room_player_id");

CREATE INDEX IF NOT EXISTS "guesses_game_id_step_number_idx" ON "guesses"("game_id", "step_number");

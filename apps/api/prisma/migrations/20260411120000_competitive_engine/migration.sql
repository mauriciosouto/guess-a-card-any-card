-- Prompt 9 — Competitive engine: step deadline, per-player state, one guess per player per step.
CREATE TYPE "CompetitivePlayerState" AS ENUM ('RACING', 'SOLVED', 'ELIMINATED');

ALTER TABLE "games" ADD COLUMN "competitive_step_deadline_at" TIMESTAMPTZ;

ALTER TABLE "game_players" ADD COLUMN "competitive_state" "CompetitivePlayerState";

CREATE UNIQUE INDEX "guesses_game_id_game_player_id_step_number_key" ON "guesses"("game_id", "game_player_id", "step_number");

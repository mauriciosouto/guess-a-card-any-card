-- Catalog-only gameplay: drop puzzle FKs, host history, puzzle tables; per-card stats keyed by catalog card id.
-- Clears test gameplay rows (guesses, game_players, games) and truncates user_card_stats.

UPDATE "rooms" SET "current_game_id" = NULL;

DELETE FROM "guesses";
DELETE FROM "game_players";
DELETE FROM "games";

ALTER TABLE "games" DROP CONSTRAINT IF EXISTS "games_puzzle_id_fkey";
DROP INDEX IF EXISTS "games_puzzle_id_idx";
ALTER TABLE "games" DROP COLUMN IF EXISTS "puzzle_id";

DROP TABLE IF EXISTS "host_puzzle_history";

ALTER TABLE "user_card_stats" DROP CONSTRAINT IF EXISTS "user_card_stats_puzzle_id_fkey";
DROP INDEX IF EXISTS "user_card_stats_user_id_puzzle_id_key";
TRUNCATE TABLE "user_card_stats";
ALTER TABLE "user_card_stats" RENAME COLUMN "puzzle_id" TO "card_id";
CREATE UNIQUE INDEX "user_card_stats_user_id_card_id_key" ON "user_card_stats"("user_id", "card_id");

DROP TABLE IF EXISTS "PuzzleStep";
DROP TABLE IF EXISTS "Puzzle";

ALTER TABLE "games" ALTER COLUMN "card_id" SET NOT NULL;
ALTER TABLE "games" ALTER COLUMN "card_name" SET NOT NULL;
ALTER TABLE "games" ALTER COLUMN "card_set" SET NOT NULL;
ALTER TABLE "games" ALTER COLUMN "card_image_url" SET NOT NULL;
ALTER TABLE "games" ALTER COLUMN "reveal_seed" SET NOT NULL;
ALTER TABLE "games" ALTER COLUMN "reveal_card_kind" SET NOT NULL;
ALTER TABLE "games" ALTER COLUMN "card_template_key" SET NOT NULL;

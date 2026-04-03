-- Puzzle / PuzzleStep: same shape as the admin app. `CREATE IF NOT EXISTS` satisfies Prisma’s empty
-- shadow database during `migrate dev`. On shared Supabase, admin tables are skipped; game columns
-- are still added with ALTER … IF NOT EXISTS below.

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE SCHEMA IF NOT EXISTS "public";

CREATE TABLE IF NOT EXISTS "Puzzle" (
    "id" TEXT NOT NULL,
    "dataSource" TEXT NOT NULL,
    "externalCardId" TEXT NOT NULL,
    "cardName" TEXT NOT NULL,
    "imageUrl" TEXT NOT NULL,
    "seed" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "savedAt" TIMESTAMP(3),

    CONSTRAINT "Puzzle_pkey" PRIMARY KEY ("id")
);

-- Non-unique: production data may duplicate (dataSource, externalCardId); unique would fail with 23505.
-- After deduping in admin, you can add a UNIQUE index in a follow-up migration.
CREATE INDEX IF NOT EXISTS "Puzzle_dataSource_externalCardId_idx" ON "Puzzle"("dataSource", "externalCardId");

CREATE TABLE IF NOT EXISTS "PuzzleStep" (
    "id" TEXT NOT NULL,
    "puzzleId" TEXT NOT NULL,
    "step" INTEGER NOT NULL,
    "blur" DOUBLE PRECISION NOT NULL,
    "brightness" DOUBLE PRECISION NOT NULL,

    CONSTRAINT "PuzzleStep_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "PuzzleStep_puzzleId_step_key" ON "PuzzleStep"("puzzleId", "step");

CREATE INDEX IF NOT EXISTS "PuzzleStep_puzzleId_step_idx" ON "PuzzleStep"("puzzleId", "step");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'PuzzleStep_puzzleId_fkey'
  ) THEN
    ALTER TABLE "PuzzleStep" ADD CONSTRAINT "PuzzleStep_puzzleId_fkey"
      FOREIGN KEY ("puzzleId") REFERENCES "Puzzle"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

ALTER TABLE "Puzzle" ADD COLUMN IF NOT EXISTS "isActive" BOOLEAN NOT NULL DEFAULT true;

ALTER TABLE "PuzzleStep" ADD COLUMN IF NOT EXISTS "imageUrl" TEXT;

CREATE INDEX IF NOT EXISTS "Puzzle_dataSource_isActive_idx" ON "Puzzle"("dataSource", "isActive");

-- CreateEnum
CREATE TYPE "GameMode" AS ENUM ('SINGLE', 'COMPETITIVE', 'COOP', 'CHALLENGE');

-- CreateEnum
CREATE TYPE "RoomState" AS ENUM ('LOBBY', 'COUNTDOWN', 'IN_PROGRESS', 'FINISHED', 'ABANDONED');

-- CreateEnum
CREATE TYPE "GameStatus" AS ENUM ('PENDING', 'IN_PROGRESS', 'WON', 'LOST', 'DRAW', 'CANCELLED');

-- CreateTable
CREATE TABLE "users" (
    "id" UUID NOT NULL,
    "display_name" TEXT NOT NULL,
    "email" TEXT,
    "provider" TEXT,
    "avatar_url" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "profiles" (
    "user_id" UUID NOT NULL,
    "preferred_avatar_id" TEXT,
    "bio" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "profiles_pkey" PRIMARY KEY ("user_id")
);

-- CreateTable
CREATE TABLE "rooms" (
    "id" UUID NOT NULL,
    "host_user_id" UUID,
    "host_guest_id" TEXT,
    "mode" "GameMode" NOT NULL,
    "state" "RoomState" NOT NULL,
    "selected_sets" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "timer_per_step_seconds" INTEGER,
    "current_game_id" UUID,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "rooms_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "room_players" (
    "id" UUID NOT NULL,
    "room_id" UUID NOT NULL,
    "user_id" UUID,
    "guest_id" TEXT,
    "display_name" TEXT NOT NULL,
    "avatar_id" TEXT,
    "is_host" BOOLEAN NOT NULL DEFAULT false,
    "turn_order" INTEGER,
    "joined_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "left_at" TIMESTAMPTZ(6),
    "is_connected" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "room_players_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "games" (
    "id" UUID NOT NULL,
    "room_id" UUID,
    "mode" "GameMode" NOT NULL,
    "puzzle_id" TEXT NOT NULL,
    "status" "GameStatus" NOT NULL,
    "started_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "finished_at" TIMESTAMPTZ(6),
    "winner_user_id" UUID,
    "winner_guest_id" TEXT,
    "winning_attempt_count" INTEGER,
    "winning_total_time_ms" INTEGER,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "games_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "game_players" (
    "id" UUID NOT NULL,
    "game_id" UUID NOT NULL,
    "room_player_id" UUID,
    "user_id" UUID,
    "guest_id" TEXT,
    "display_name" TEXT NOT NULL,
    "avatar_id" TEXT,
    "final_rank" INTEGER,
    "solved_at_step" INTEGER,
    "solved_total_time_ms" INTEGER,
    "did_win" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "game_players_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "guesses" (
    "id" UUID NOT NULL,
    "game_id" UUID NOT NULL,
    "game_player_id" UUID NOT NULL,
    "step_number" INTEGER NOT NULL,
    "guess_text" TEXT NOT NULL,
    "normalized_guess_text" TEXT NOT NULL,
    "is_correct" BOOLEAN NOT NULL,
    "time_taken_ms" INTEGER NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "guesses_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_stats" (
    "user_id" UUID NOT NULL,
    "games_played" INTEGER NOT NULL DEFAULT 0,
    "games_won" INTEGER NOT NULL DEFAULT 0,
    "games_lost" INTEGER NOT NULL DEFAULT 0,
    "average_attempts_to_win" DECIMAL(6,2),
    "best_attempts_record" INTEGER,
    "best_time_record_ms" INTEGER,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "user_stats_pkey" PRIMARY KEY ("user_id")
);

-- CreateTable
CREATE TABLE "user_card_stats" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "puzzle_id" TEXT NOT NULL,
    "times_played" INTEGER NOT NULL DEFAULT 0,
    "times_won" INTEGER NOT NULL DEFAULT 0,
    "average_attempts" DECIMAL(6,2),
    "average_time_ms" DECIMAL(12,2),
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "user_card_stats_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "host_puzzle_history" (
    "id" UUID NOT NULL,
    "host_user_id" UUID,
    "host_guest_id" TEXT,
    "puzzle_id" TEXT NOT NULL,
    "last_played_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "host_puzzle_history_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "achievements" (
    "id" UUID NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "achievements_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_achievements" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "achievement_id" UUID NOT NULL,
    "unlocked_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "user_achievements_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "rooms_current_game_id_key" ON "rooms"("current_game_id");

-- CreateIndex
CREATE INDEX "rooms_host_user_id_idx" ON "rooms"("host_user_id");

-- CreateIndex
CREATE INDEX "rooms_host_guest_id_idx" ON "rooms"("host_guest_id");

-- CreateIndex
CREATE INDEX "room_players_room_id_joined_at_idx" ON "room_players"("room_id", "joined_at");

-- CreateIndex
CREATE INDEX "games_room_id_idx" ON "games"("room_id");

-- CreateIndex
CREATE INDEX "games_puzzle_id_idx" ON "games"("puzzle_id");

-- CreateIndex
CREATE INDEX "games_status_idx" ON "games"("status");

-- CreateIndex
CREATE INDEX "game_players_game_id_idx" ON "game_players"("game_id");

-- CreateIndex
CREATE INDEX "game_players_user_id_idx" ON "game_players"("user_id");

-- CreateIndex
CREATE INDEX "game_players_guest_id_idx" ON "game_players"("guest_id");

-- CreateIndex
CREATE INDEX "guesses_game_id_game_player_id_step_number_idx" ON "guesses"("game_id", "game_player_id", "step_number");

-- CreateIndex
CREATE INDEX "user_card_stats_user_id_idx" ON "user_card_stats"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "user_card_stats_user_id_puzzle_id_key" ON "user_card_stats"("user_id", "puzzle_id");

-- CreateIndex
CREATE INDEX "host_puzzle_history_host_user_id_last_played_at_idx" ON "host_puzzle_history"("host_user_id", "last_played_at");

-- CreateIndex
CREATE INDEX "host_puzzle_history_host_guest_id_last_played_at_idx" ON "host_puzzle_history"("host_guest_id", "last_played_at");

-- CreateIndex
CREATE UNIQUE INDEX "achievements_code_key" ON "achievements"("code");

-- CreateIndex
CREATE UNIQUE INDEX "user_achievements_user_id_achievement_id_key" ON "user_achievements"("user_id", "achievement_id");

-- AddForeignKey
ALTER TABLE "profiles" ADD CONSTRAINT "profiles_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "rooms" ADD CONSTRAINT "rooms_host_user_id_fkey" FOREIGN KEY ("host_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "rooms" ADD CONSTRAINT "rooms_current_game_id_fkey" FOREIGN KEY ("current_game_id") REFERENCES "games"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "room_players" ADD CONSTRAINT "room_players_room_id_fkey" FOREIGN KEY ("room_id") REFERENCES "rooms"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "room_players" ADD CONSTRAINT "room_players_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "games" ADD CONSTRAINT "games_room_id_fkey" FOREIGN KEY ("room_id") REFERENCES "rooms"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "games" ADD CONSTRAINT "games_puzzle_id_fkey" FOREIGN KEY ("puzzle_id") REFERENCES "Puzzle"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "games" ADD CONSTRAINT "games_winner_user_id_fkey" FOREIGN KEY ("winner_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "game_players" ADD CONSTRAINT "game_players_game_id_fkey" FOREIGN KEY ("game_id") REFERENCES "games"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "game_players" ADD CONSTRAINT "game_players_room_player_id_fkey" FOREIGN KEY ("room_player_id") REFERENCES "room_players"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "game_players" ADD CONSTRAINT "game_players_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "guesses" ADD CONSTRAINT "guesses_game_id_fkey" FOREIGN KEY ("game_id") REFERENCES "games"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "guesses" ADD CONSTRAINT "guesses_game_player_id_fkey" FOREIGN KEY ("game_player_id") REFERENCES "game_players"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_stats" ADD CONSTRAINT "user_stats_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_card_stats" ADD CONSTRAINT "user_card_stats_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_card_stats" ADD CONSTRAINT "user_card_stats_puzzle_id_fkey" FOREIGN KEY ("puzzle_id") REFERENCES "Puzzle"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "host_puzzle_history" ADD CONSTRAINT "host_puzzle_history_host_user_id_fkey" FOREIGN KEY ("host_user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "host_puzzle_history" ADD CONSTRAINT "host_puzzle_history_puzzle_id_fkey" FOREIGN KEY ("puzzle_id") REFERENCES "Puzzle"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_achievements" ADD CONSTRAINT "user_achievements_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_achievements" ADD CONSTRAINT "user_achievements_achievement_id_fkey" FOREIGN KEY ("achievement_id") REFERENCES "achievements"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "users" ALTER COLUMN "id" SET DEFAULT gen_random_uuid();
ALTER TABLE "rooms" ALTER COLUMN "id" SET DEFAULT gen_random_uuid();
ALTER TABLE "room_players" ALTER COLUMN "id" SET DEFAULT gen_random_uuid();
ALTER TABLE "games" ALTER COLUMN "id" SET DEFAULT gen_random_uuid();
ALTER TABLE "game_players" ALTER COLUMN "id" SET DEFAULT gen_random_uuid();
ALTER TABLE "guesses" ALTER COLUMN "id" SET DEFAULT gen_random_uuid();
ALTER TABLE "user_card_stats" ALTER COLUMN "id" SET DEFAULT gen_random_uuid();
ALTER TABLE "host_puzzle_history" ALTER COLUMN "id" SET DEFAULT gen_random_uuid();
ALTER TABLE "achievements" ALTER COLUMN "id" SET DEFAULT gen_random_uuid();
ALTER TABLE "user_achievements" ALTER COLUMN "id" SET DEFAULT gen_random_uuid();

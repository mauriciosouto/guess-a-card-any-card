-- Challenge v1: host-fixed card + seed; one linked Game for the challenged player.

CREATE TYPE "ChallengeStatus" AS ENUM ('PENDING', 'IN_PROGRESS', 'COMPLETED');
CREATE TYPE "ChallengeOutcome" AS ENUM ('WON', 'LOST', 'ABANDONED');

CREATE TABLE "challenges" (
    "id" UUID NOT NULL,
    "created_by_user_id" UUID,
    "created_by_guest_id" TEXT,
    "card_id" TEXT NOT NULL,
    "card_name" TEXT NOT NULL,
    "card_set" TEXT NOT NULL,
    "card_image_url" TEXT NOT NULL,
    "reveal_seed" TEXT NOT NULL,
    "reveal_card_kind" TEXT NOT NULL,
    "card_template_key" TEXT NOT NULL,
    "status" "ChallengeStatus" NOT NULL,
    "outcome" "ChallengeOutcome",
    "game_id" UUID,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "started_at" TIMESTAMPTZ(6),
    "completed_at" TIMESTAMPTZ(6),
    "attempts_used" INTEGER,
    "time_ms" INTEGER,
    "final_guess" TEXT,

    CONSTRAINT "challenges_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "challenges_game_id_key" ON "challenges"("game_id");

CREATE INDEX "challenges_created_by_user_id_idx" ON "challenges"("created_by_user_id");
CREATE INDEX "challenges_created_by_guest_id_idx" ON "challenges"("created_by_guest_id");
CREATE INDEX "challenges_status_idx" ON "challenges"("status");

ALTER TABLE "challenges" ADD CONSTRAINT "challenges_created_by_user_id_fkey" FOREIGN KEY ("created_by_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "challenges" ADD CONSTRAINT "challenges_game_id_fkey" FOREIGN KEY ("game_id") REFERENCES "games"("id") ON DELETE SET NULL ON UPDATE CASCADE;

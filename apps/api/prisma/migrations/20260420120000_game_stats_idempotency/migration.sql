-- Idempotent stats pipeline markers
ALTER TABLE "games" ADD COLUMN "stats_aggregated_at" TIMESTAMPTZ(6);

ALTER TABLE "user_stats" ADD COLUMN "last_played_at" TIMESTAMPTZ(6);

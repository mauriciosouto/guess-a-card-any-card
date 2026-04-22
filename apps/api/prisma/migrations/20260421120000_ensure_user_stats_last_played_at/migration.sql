-- user_stats originally had no last_played_at; some databases never received the column.
-- Safe on Postgres: no-op if the column already exists.
ALTER TABLE "user_stats" ADD COLUMN IF NOT EXISTS "last_played_at" TIMESTAMPTZ(6);

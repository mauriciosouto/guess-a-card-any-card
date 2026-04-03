-- Optional FAB set code (admin `fabSet`); nullable for legacy puzzles.
ALTER TABLE "Puzzle" ADD COLUMN IF NOT EXISTS "fabSet" TEXT;

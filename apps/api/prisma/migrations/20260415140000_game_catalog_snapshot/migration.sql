-- New games: card snapshot + optional puzzle FK (legacy rows keep puzzle_id).
ALTER TABLE "games" ALTER COLUMN "puzzle_id" DROP NOT NULL;

ALTER TABLE "games" ADD COLUMN "card_id" TEXT;
ALTER TABLE "games" ADD COLUMN "card_name" TEXT;
ALTER TABLE "games" ADD COLUMN "card_set" TEXT;
ALTER TABLE "games" ADD COLUMN "card_image_url" TEXT;
ALTER TABLE "games" ADD COLUMN "reveal_seed" TEXT;
ALTER TABLE "games" ADD COLUMN "reveal_card_kind" TEXT;
ALTER TABLE "games" ADD COLUMN "card_template_key" TEXT;

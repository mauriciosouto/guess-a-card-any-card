/**
 * Prompt 2 — seed script plan (BLUEPRINT_PRO.md §28.2): idempotent catalog data.
 * Achievements only; puzzles remain owned by the admin app / shared DB.
 */
import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error("DATABASE_URL is not set");
}

const prisma = new PrismaClient({
  adapter: new PrismaPg({
    connectionString,
    ...(process.env.DATABASE_SSL_REJECT_UNAUTHORIZED === "false"
      ? { ssl: { rejectUnauthorized: false } }
      : {}),
  }),
});

/** Achievement catalog from BLUEPRINT_PRO.md §23.2 — extend as product evolves. */
const ACHIEVEMENTS = [
  {
    code: "FIRST_BLOOD",
    name: "First Blood",
    description: "Your first win.",
  },
  {
    code: "SHARP_EYE",
    name: "Sharp Eye",
    description: "Win on step 3 or earlier.",
  },
  {
    code: "CONSISTENT_SCHOLAR",
    name: "Consistent Scholar",
    description: "Five wins in a row.",
  },
  {
    code: "SET_SPECIALIST",
    name: "Set Specialist",
    description: "Ten wins on the same set.",
  },
  {
    code: "NEVER_GIVE_UP",
    name: "Never Give Up",
    description: "Win on the final step.",
  },
] as const;

async function main() {
  for (const a of ACHIEVEMENTS) {
    await prisma.achievement.upsert({
      where: { code: a.code },
      create: { code: a.code, name: a.name, description: a.description },
      update: { name: a.name, description: a.description },
    });
  }
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });

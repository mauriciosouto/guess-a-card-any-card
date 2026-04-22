import { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";

type EnsureUserClaims = {
  email?: string | null;
  avatarUrl?: string | null;
};

/**
 * Ensures a `User` row exists for a verified Supabase `sub` (aligned with `User.id`).
 * Uses INSERT ... ON CONFLICT to avoid P2002 race conditions on concurrent first-login requests.
 * On conflict: refreshes avatar_url from the OAuth provider when a newer value is available,
 * so profile photos stay up to date without overwriting user-set avatars with null.
 */
export async function ensureLocalUserForAuth(
  userId: string,
  claims?: EnsureUserClaims,
): Promise<void> {
  const email = claims?.email?.trim() || null;
  const avatarUrl = claims?.avatarUrl?.trim() || null;
  const fromEmail =
    email && email.includes("@") ? email.split("@")[0]!.slice(0, 64).trim() : null;
  const displayName =
    fromEmail && fromEmail.length > 0 ? fromEmail : `Player ${userId.slice(0, 8)}`;

  await prisma.$executeRaw(Prisma.sql`
    INSERT INTO "users" ("id", "display_name", "email", "avatar_url", "created_at", "updated_at")
    VALUES (${userId}::uuid, ${displayName}, ${email}, ${avatarUrl}, NOW(), NOW())
    ON CONFLICT ("id") DO UPDATE SET
      avatar_url = COALESCE(EXCLUDED.avatar_url, "users"."avatar_url"),
      updated_at = NOW()
  `);
}

/**
 * DB-facing types mirror Prisma models once the schema lands.
 * Keep this file for cross-layer DTOs without importing Prisma in the client.
 */

export type UserRow = {
  id: string;
  displayName: string;
  email: string | null;
  provider: string | null;
  avatarUrl: string | null;
  createdAt: string;
  updatedAt: string;
};

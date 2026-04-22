import { Type, type Printing } from "@flesh-and-blood/types";
import { beforeEach, describe, expect, it, vi } from "vitest";

const challengeCreate = vi.hoisted(() =>
  vi.fn().mockResolvedValue({ id: "00000000-0000-4000-8000-000000000099" }),
);

vi.mock("@/lib/prisma", () => ({
  prisma: {
    challenge: {
      create: challengeCreate,
    },
  },
}));

vi.mock("@/server/services/card-catalog-service", () => ({
  getCatalogCardById: vi.fn(() => ({
    id: "catalog-card-1",
    name: "Test Card",
    setKey: "MON",
    fabCard: { types: [Type.Hero] },
    imageUrl: "key.width-450",
    printing: {} as Printing,
  })),
}));

describe("createChallenge ownership persistence", () => {
  beforeEach(() => {
    challengeCreate.mockClear();
  });

  it("persists user host only", async () => {
    const { createChallenge } = await import("@/server/services/challenge-service");
    const uid = "11111111-1111-4111-8111-111111111111";
    await createChallenge({
      cardId: "catalog-card-1",
      hostIdentity: { userId: uid, guestId: null },
    });
    expect(challengeCreate).toHaveBeenCalledTimes(1);
    const arg = challengeCreate.mock.calls[0]![0] as {
      data: { createdByUserId: string | null; createdByGuestId: string | null };
    };
    expect(arg.data.createdByUserId).toBe(uid);
    expect(arg.data.createdByGuestId).toBeNull();
  });

  it("persists guest host only", async () => {
    const { createChallenge } = await import("@/server/services/challenge-service");
    await createChallenge({
      cardId: "catalog-card-1",
      hostIdentity: { userId: null, guestId: "guest-host-xyz" },
    });
    const arg = challengeCreate.mock.calls[0]![0] as {
      data: { createdByUserId: string | null; createdByGuestId: string | null };
    };
    expect(arg.data.createdByUserId).toBeNull();
    expect(arg.data.createdByGuestId).toBe("guest-host-xyz");
  });

  it("does not write challenge when host identity is invalid", async () => {
    const { createChallenge } = await import("@/server/services/challenge-service");
    await expect(
      createChallenge({
        cardId: "catalog-card-1",
        hostIdentity: {
          userId: "11111111-1111-4111-8111-111111111111",
          guestId: "also-guest",
        },
      }),
    ).rejects.toMatchObject({ name: "ChallengeHttpError", status: 400 });
    expect(challengeCreate).not.toHaveBeenCalled();
  });
});

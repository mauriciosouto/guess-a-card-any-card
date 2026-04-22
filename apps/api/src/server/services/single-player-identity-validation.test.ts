import { describe, expect, it } from "vitest";

import { startSinglePlayerGame } from "@/server/services/single-player-service";

describe("startSinglePlayerGame ownership validation", () => {
  it("rejects identity with both userId and guestId (no DB)", async () => {
    await expect(
      startSinglePlayerGame({
        selectedFabSets: [],
        identity: {
          userId: "11111111-1111-4111-8111-111111111111",
          guestId: "guest-x",
        },
      }),
    ).rejects.toMatchObject({
      name: "SinglePlayerHttpError",
      status: 400,
    });
  });

  it("rejects identity with neither user nor guest", async () => {
    await expect(
      startSinglePlayerGame({
        selectedFabSets: [],
        identity: { userId: null, guestId: null },
      }),
    ).rejects.toMatchObject({
      name: "SinglePlayerHttpError",
      status: 400,
    });
  });
});

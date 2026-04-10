/** JSON shape of `GET /api/coop/rooms/:id` and coop WebSocket `state` payloads (viewer-specific). */
export type CoopRoomSnapshot = {
  id: string;
  state: string;
  selectedSets: string[];
  requesterIsHost: boolean;
  players: Array<{
    id: string;
    displayName: string;
    isHost: boolean;
    turnOrder: number | null;
    isConnected: boolean;
  }>;
  game: null | {
    id: string;
    status: string;
    currentStep: number | null;
    totalSteps: number;
    cardImageUrl: string;
    puzzleSeed: string;
    currentImageUrl: string | null;
    cardName: string | null;
    dataSource: string | null;
    fabSet: string | null;
    activeTurnRoomPlayerId: string | null;
    activePlayerDisplayName: string | null;
    attemptCount: number;
    guesses: Array<{
      id: string;
      stepNumber: number;
      guessText: string;
      isCorrect: boolean;
      submittedByHostOverride: boolean;
      speakerDisplayName: string;
      createdAt: string;
    }>;
    requesterRoomPlayerId: string;
    requesterIsHost: boolean;
    requesterCanSubmit: boolean;
    requesterCanHostOverride: boolean;
  };
};

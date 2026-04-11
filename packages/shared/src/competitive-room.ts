/** JSON shape of `GET /api/competitive/rooms/:id`. */
export type CompetitiveRoomSnapshot = {
  id: string;
  state: string;
  selectedSets: string[];
  timerPerStepSeconds: number | null;
  requesterIsHost: boolean;
  players: Array<{
    id: string;
    displayName: string;
    isHost: boolean;
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
    competitiveStepDeadlineAt: string | null;
    timerPerStepSeconds: number | null;
    players: Array<{
      roomPlayerId: string;
      displayName: string;
      competitiveState: string | null;
      attemptCount: number;
      totalTimeMs: number;
      submittedThisStep: boolean;
      finalRank: number | null;
    }>;
    requesterRoomPlayerId: string;
    requesterIsHost: boolean;
    requesterCanSubmit: boolean;
    guesses: Array<{
      id: string;
      stepNumber: number;
      guessText: string;
      isCorrect: boolean;
      speakerDisplayName: string;
      createdAt: string;
    }>;
  };
};

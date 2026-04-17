export type ChallengeStatus = "PENDING" | "IN_PROGRESS" | "COMPLETED";

export type ChallengeOutcome = "WON" | "LOST" | "ABANDONED";

export type ChallengePublicDto = {
  id: string;
  status: ChallengeStatus;
  /** Set when `status === COMPLETED`. */
  outcome?: ChallengeOutcome;
  attemptsUsed?: number;
  timeMs?: number;
};

export type ChallengeResultGuessLine = {
  id: string;
  stepNumber: number;
  guessText: string;
  isCorrect: boolean;
  timeTakenMs: number;
  createdAt: string;
};

export type ChallengeResultDto = {
  outcome: ChallengeOutcome;
  attemptsUsed: number;
  timeMs: number;
  finalGuess: string | null;
  guesses: ChallengeResultGuessLine[];
  cardId: string;
  cardName: string;
};

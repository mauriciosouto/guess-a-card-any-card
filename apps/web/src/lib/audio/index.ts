/**
 * Audio cues (guess submit, correct, wrong, reveal) — wire in gameplay phase.
 */
export const audio = {
  playGuessSubmit: async (): Promise<void> => {},
  playCorrect: async (): Promise<void> => {},
  playWrong: async (): Promise<void> => {},
  playReveal: async (): Promise<void> => {},
} as const;

/** Blueprint §18 — MVP: trim, lowercase, collapse inner whitespace. */
export function normalizeGuessText(raw: string): string {
  return raw
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ");
}

export function guessesAreEqual(normalizedGuess: string, normalizedCardName: string): boolean {
  return normalizedGuess === normalizedCardName;
}

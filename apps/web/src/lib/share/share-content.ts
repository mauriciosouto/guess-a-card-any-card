export type ShareContentInput = {
  title: string;
  text: string;
  url: string;
  /** Shown after a successful share or clipboard copy, or on failure. */
  onFeedback?: (message: string) => void;
};

/**
 * Uses Web Share API when available; otherwise copies `text` + newline + `url` to the clipboard.
 */
export async function shareContent(input: ShareContentInput): Promise<void> {
  const { title, text, url, onFeedback } = input;

  if (typeof navigator !== "undefined" && typeof navigator.share === "function") {
    try {
      await navigator.share({ title, text, url });
      onFeedback?.("Shared");
      return;
    } catch (e) {
      const name = e instanceof Error ? e.name : "";
      if (name === "AbortError" || (e as { message?: string })?.message === "Share canceled") {
        return;
      }
    }
  }

  const combined = url.trim().length > 0 ? `${text}\n${url}` : text;

  if (typeof navigator !== "undefined" && navigator.clipboard?.writeText) {
    try {
      await navigator.clipboard.writeText(combined);
      onFeedback?.("Copied to clipboard");
      return;
    } catch {
      onFeedback?.("Could not copy — try copying the link yourself.");
    }
  } else {
    onFeedback?.("Could not copy — try copying the link yourself.");
  }
}

import { cn } from "@/lib/utils/cn";
import { Panel } from "@/components/ui/panel";

export type ResultBannerProps = {
  variant: "idle" | "correct" | "wrong";
  message?: string;
  className?: string;
};

export function ResultBanner({ variant, message, className }: ResultBannerProps) {
  if (variant === "idle" && !message) return null;

  const text =
    message ??
    (variant === "correct"
      ? "The veil lifts — you spoke the true name."
      : variant === "wrong"
        ? "The omen falters. Another veil thins."
        : null);

  return (
    <Panel
      variant="subtle"
      role="status"
      aria-live="polite"
      className={cn(
        "py-4 text-center",
        variant === "correct" &&
          cn(
            "border-emerald-700/45 bg-emerald-950/25 text-emerald-100",
            "animate-pulse-win",
          ),
        variant === "wrong" &&
          cn(
            "border-[var(--blood)]/55 bg-[var(--wine)]/30 text-rose-100",
            "animate-shake-lose",
          ),
        variant === "idle" && "text-[var(--parchment-dim)]",
        className,
      )}
    >
      <p className="font-display text-sm font-semibold uppercase tracking-[0.18em]">
        {text}
      </p>
    </Panel>
  );
}

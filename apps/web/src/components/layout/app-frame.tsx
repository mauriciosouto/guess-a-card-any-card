import type { ReactNode } from "react";
import { ParticleField } from "@/components/effects/particle-field";
import { cn } from "@/lib/utils/cn";

export type AppFrameProps = {
  children: ReactNode;
  /** Narrower readable column for marketing pages */
  variant?: "default" | "wide" | "game";
  className?: string;
  /** Less padding under the site header (e.g. marketing / home hero). */
  compactTop?: boolean;
};

export function AppFrame({
  children,
  variant = "default",
  className,
  compactTop = false,
}: AppFrameProps) {
  const max =
    variant === "game"
      ? "max-w-5xl"
      : variant === "wide"
        ? "max-w-6xl"
        : "max-w-4xl";

  return (
    <div className={cn("relative z-10 flex min-h-0 flex-1 flex-col", className)}>
      <ParticleField />
      <div
        className={cn(
          "relative z-10 mx-auto w-full flex-1 px-4 pb-12 sm:px-6",
          compactTop ? "pt-2 sm:pt-3" : "pt-8 sm:pt-10",
          max,
        )}
      >
        {children}
      </div>
    </div>
  );
}

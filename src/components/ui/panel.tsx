import { type HTMLAttributes } from "react";
import { assetPaths } from "@/lib/design-tokens";
import { cn } from "@/lib/utils/cn";

export type PanelProps = HTMLAttributes<HTMLDivElement> & {
  variant?: "default" | "subtle" | "emphasis" | "textured";
};

export function Panel({
  className,
  variant = "default",
  children,
  style,
  ...props
}: PanelProps) {
  const textureStyle =
    variant === "textured" || variant === "emphasis"
      ? {
          backgroundImage: `
            linear-gradient(165deg, rgba(12, 6, 18, 0.88) 0%, rgba(26, 10, 30, 0.82) 50%, rgba(20, 8, 14, 0.9) 100%),
            url("${assetPaths.panelTexture}")
          `,
          backgroundSize: "cover, cover",
          backgroundPosition: "center, center",
          backgroundBlendMode: "normal, soft-light",
          ...style,
        }
      : style;

  return (
    <div
      className={cn(
        "rounded-xl border shadow-[0_12px_40px_rgba(0,0,0,0.5),var(--shadow-panel-inset)]",
        variant === "default" &&
          "border-[var(--wine-deep)]/90 bg-[var(--plum)]/75 backdrop-blur-sm",
        variant === "subtle" &&
          "border-[var(--wine-deep)]/60 bg-[var(--void)]/50 backdrop-blur-sm",
        variant === "emphasis" &&
          "border-[var(--gold-dim)]/45 bg-[var(--plum-mid)]/85 backdrop-blur-md",
        variant === "textured" &&
          "border-[var(--gold)]/25 bg-[var(--plum)]/90 backdrop-blur-sm",
        className,
      )}
      style={textureStyle}
      {...props}
    >
      {children}
    </div>
  );
}

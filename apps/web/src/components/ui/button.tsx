import { Slot } from "@radix-ui/react-slot";
import { forwardRef, type ButtonHTMLAttributes } from "react";
import { cn } from "@/lib/utils/cn";

export type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "secondary" | "ghost" | "outline";
  size?: "sm" | "md" | "lg";
  asChild?: boolean;
};

const buttonClass = (
  variant: ButtonProps["variant"] = "primary",
  size: ButtonProps["size"] = "md",
  className?: string,
) =>
  cn(
    "font-display relative inline-flex items-center justify-center gap-2 font-semibold uppercase tracking-[0.12em] transition-[box-shadow,transform,border-color,background-color,color] duration-300 disabled:pointer-events-none disabled:opacity-45",
    "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--gold)]",
    "rounded-md border-2",
    variant === "primary" &&
      cn(
        "border-[var(--gold)]/85 bg-gradient-to-b from-[var(--gold-bright)]/18 via-[var(--plum-mid)] to-[var(--void)] text-[var(--gold-bright)]",
        "shadow-[inset_0_1px_0_rgba(255,255,255,0.1),0_4px_20px_rgba(0,0,0,0.4)]",
        "hover:border-[var(--gold-bright)] hover:text-[var(--parchment)] hover:shadow-[0_0_28px_rgba(201,162,39,0.35),inset_0_1px_0_rgba(255,255,255,0.12)] hover:-translate-y-px active:translate-y-0",
      ),
    variant === "secondary" &&
      cn(
        "border-[var(--blood)]/55 bg-[var(--wine)]/35 text-[var(--parchment-dim)]",
        "hover:border-[var(--blood)]/85 hover:bg-[var(--wine)]/55 hover:text-[var(--parchment)] hover:shadow-[0_0_20px_var(--glow-blood)]",
      ),
    variant === "outline" &&
      cn(
        "border-[var(--gold-dim)]/6 bg-transparent text-[var(--parchment-dim)]",
        "hover:border-[var(--gold)]/65 hover:bg-[var(--gold)]/08 hover:text-[var(--gold-bright)] hover:shadow-[0_0_18px_rgba(201,162,39,0.2)]",
      ),
    variant === "ghost" &&
      cn(
        "border-transparent bg-transparent text-[var(--mist)]",
        "hover:bg-[var(--plum)]/50 hover:text-[var(--parchment)]",
      ),
    size === "sm" && "h-9 px-3 text-[0.65rem] sm:text-xs",
    size === "md" && "h-11 px-5 text-[0.7rem] sm:text-xs",
    size === "lg" && "h-12 px-8 text-xs sm:text-sm",
    className,
  );

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      className,
      variant = "primary",
      size = "md",
      type = "button",
      asChild,
      ...props
    },
    ref,
  ) => {
    const Comp = asChild ? Slot : "button";
    return (
      <Comp
        ref={ref}
        type={asChild ? undefined : type}
        className={buttonClass(variant, size, className)}
        {...props}
      />
    );
  },
);

Button.displayName = "Button";

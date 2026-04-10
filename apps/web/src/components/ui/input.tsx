import { forwardRef, type InputHTMLAttributes } from "react";
import { cn } from "@/lib/utils/cn";

export type InputProps = InputHTMLAttributes<HTMLInputElement>;

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className, type = "text", ...props }, ref) => (
    <input
      ref={ref}
      type={type}
      className={cn(
        "flex h-12 w-full rounded-lg border-2 border-[var(--wine-deep)] bg-[var(--void)]/85 px-4 text-sm text-[var(--parchment)] shadow-[inset_0_2px_12px_rgba(0,0,0,0.45)] transition-[border-color,box-shadow,background-color] duration-300 placeholder:text-[var(--mist)]/70",
        "focus-visible:border-[var(--gold)]/75 focus-visible:bg-[var(--plum)]/60 focus-visible:shadow-[0_0_0_1px_rgba(201,162,39,0.35),0_0_24px_rgba(201,162,39,0.2),inset_0_2px_12px_rgba(0,0,0,0.35)] focus-visible:outline-none",
        "disabled:cursor-not-allowed disabled:opacity-50",
        className,
      )}
      {...props}
    />
  ),
);

Input.displayName = "Input";

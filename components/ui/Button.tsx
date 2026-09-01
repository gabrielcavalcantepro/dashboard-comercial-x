"use client";

import { forwardRef } from "react";
import clsx from "clsx";

type Variant = "primary" | "secondary" | "ghost" | "danger";
type Size = "md" | "sm";

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
}

const base =
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-[var(--radius-sm)] font-medium transition-all duration-200 disabled:opacity-40 disabled:pointer-events-none";

const variants: Record<Variant, string> = {
  primary:
    "bg-[var(--color-accent)] text-[var(--color-accent-ink)] hover:brightness-105 active:brightness-95 shadow-[0_10px_30px_-12px_rgba(250,210,20,0.55)]",
  secondary:
    "bg-[var(--color-surface-raised)] text-[var(--color-text)] border border-[var(--color-border-strong)] hover:border-[var(--color-accent-border)] hover:bg-[var(--color-surface)]",
  ghost:
    "bg-transparent text-[var(--color-text-muted)] hover:text-[var(--color-text)] hover:bg-white/5",
  danger:
    "bg-transparent border border-[rgba(255,111,112,0.35)] text-[var(--color-negative)] hover:bg-[rgba(255,111,112,0.1)]",
};

const sizes: Record<Size, string> = {
  md: "h-11 px-5 text-sm",
  sm: "h-9 px-3.5 text-[13px]",
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "secondary", size = "md", ...props }, ref) => {
    return (
      <button
        ref={ref}
        className={clsx(base, variants[variant], sizes[size], className)}
        {...props}
      />
    );
  },
);
Button.displayName = "Button";

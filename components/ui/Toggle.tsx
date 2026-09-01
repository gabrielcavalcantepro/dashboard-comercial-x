"use client";

import clsx from "clsx";

interface ToggleProps {
  checked: boolean;
  onChange: () => void;
  label?: string;
  className?: string;
}

export function Toggle({ checked, onChange, label, className }: ToggleProps) {
  return (
    <label className={clsx("flex cursor-pointer items-center gap-2.5 select-none", className)}>
      {label && <span className="text-[13px] text-[var(--color-text-muted)]">{label}</span>}
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={onChange}
        className={clsx(
          "relative h-[20px] w-[34px] shrink-0 rounded-full border transition-colors duration-200",
          checked
            ? "border-[var(--color-accent)] bg-[var(--color-accent)]"
            : "border-[var(--color-border-strong)] bg-[var(--color-surface-sunken)]",
        )}
      >
        <span
          className={clsx(
            "absolute top-1/2 h-[14px] w-[14px] -translate-y-1/2 rounded-full transition-all duration-200",
            checked
              ? "left-[17px] bg-[var(--color-accent-ink)]"
              : "left-[3px] bg-[var(--color-text-muted)]",
          )}
        />
      </button>
    </label>
  );
}

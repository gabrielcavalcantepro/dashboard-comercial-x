"use client";

import clsx from "clsx";

interface CheckboxProps {
  checked: boolean;
  onChange: () => void;
  label?: React.ReactNode;
  dotColor?: string;
  className?: string;
}

export function Checkbox({ checked, onChange, label, dotColor, className }: CheckboxProps) {
  return (
    <label
      className={clsx(
        "flex cursor-pointer items-center gap-2.5 select-none",
        className,
      )}
    >
      <input
        type="checkbox"
        checked={checked}
        onChange={onChange}
        className="peer sr-only"
      />
      <span
        className={clsx(
          "flex h-[16px] w-[16px] shrink-0 items-center justify-center rounded-[5px] border transition-all duration-150",
          checked
            ? "border-[var(--color-accent)] bg-[var(--color-accent)]"
            : "border-[var(--color-border-strong)] bg-transparent peer-focus-visible:outline peer-focus-visible:outline-2 peer-focus-visible:outline-[var(--color-accent)]",
        )}
      >
        {checked && (
          <svg width="10" height="8" viewBox="0 0 10 8" fill="none">
            <path
              d="M1 4L3.5 6.5L9 1"
              stroke="var(--color-accent-ink)"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        )}
      </span>
      {dotColor && (
        <span
          className="h-[7px] w-[7px] shrink-0 rounded-full"
          style={{ background: dotColor }}
        />
      )}
      {label && <span className="text-sm text-[var(--color-text)]">{label}</span>}
    </label>
  );
}

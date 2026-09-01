import { forwardRef } from "react";
import clsx from "clsx";

interface TextFieldProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label: string;
  hint?: string;
  error?: string;
  icon?: React.ReactNode;
}

export const TextField = forwardRef<HTMLInputElement, TextFieldProps>(
  ({ label, hint, error, icon, className, id, ...props }, ref) => {
    const inputId = id ?? props.name;
    return (
      <div className="flex flex-col gap-1.5">
        <label htmlFor={inputId} className="text-[13px] font-medium text-[var(--color-text-muted)]">
          {label}
        </label>
        <div className="relative">
          {icon && (
            <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--color-text-faint)]">
              {icon}
            </span>
          )}
          <input
            ref={ref}
            id={inputId}
            className={clsx(
              "h-11 w-full rounded-[var(--radius-sm)] border bg-[var(--color-surface-sunken)] text-[14px] text-[var(--color-text)] placeholder:text-[var(--color-text-faint)] transition-colors duration-150",
              icon ? "pl-9 pr-3.5" : "px-3.5",
              error
                ? "border-[var(--color-negative)]"
                : "border-[var(--color-border-strong)] focus:border-[var(--color-accent-border)]",
              className,
            )}
            {...props}
          />
        </div>
        {error ? (
          <span className="text-[12px] text-[var(--color-negative)]">{error}</span>
        ) : hint ? (
          <span className="text-[12px] text-[var(--color-text-faint)]">{hint}</span>
        ) : null}
      </div>
    );
  },
);
TextField.displayName = "TextField";

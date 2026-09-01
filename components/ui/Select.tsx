"use client";

import { useEffect, useId, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import clsx from "clsx";

export interface SelectOption {
  value: string;
  label: string;
}

interface SelectProps {
  label: string;
  options: SelectOption[];
  value: string;
  onChange: (value: string) => void;
  icon?: React.ReactNode;
  className?: string;
}

export function Select({ label, options, value, onChange, icon, className }: SelectProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const id = useId();

  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onClick);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const atual = options.find((o) => o.value === value);

  return (
    <div className="flex flex-col gap-1.5">
      <label id={id} className="text-[13px] font-medium text-[var(--color-text-muted)]">
        {label}
      </label>
      <div ref={ref} className={clsx("relative", className)}>
        <button
          type="button"
          aria-labelledby={id}
          aria-expanded={open}
          onClick={() => setOpen((v) => !v)}
          className={clsx(
            "flex h-11 w-full items-center justify-between gap-2 rounded-[var(--radius-sm)] border bg-[var(--color-surface-sunken)] px-3.5 text-left text-[14px] transition-colors duration-150",
            open ? "border-[var(--color-accent-border)]" : "border-[var(--color-border-strong)]",
          )}
        >
          <span className="flex min-w-0 items-center gap-2">
            {icon && <span className="shrink-0 text-[var(--color-text-faint)]">{icon}</span>}
            <span className="truncate text-[var(--color-text)]">{atual?.label ?? "Selecione"}</span>
          </span>
          <svg
            width="10"
            height="6"
            viewBox="0 0 10 6"
            fill="none"
            className={clsx("shrink-0 transition-transform duration-200", open && "rotate-180")}
          >
            <path
              d="M1 1L5 5L9 1"
              stroke="var(--color-text-faint)"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </button>

        <AnimatePresence>
          {open && (
            <motion.div
              initial={{ opacity: 0, y: -4, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -4, scale: 0.98 }}
              transition={{ duration: 0.14, ease: "easeOut" }}
              className="absolute left-0 top-[calc(100%+6px)] z-40 max-h-[240px] w-full overflow-y-auto rounded-[var(--radius-md)] border border-[var(--color-border-strong)] bg-[var(--color-surface-raised)] p-1.5 shadow-[0_30px_60px_-20px_rgba(0,0,0,0.8)]"
            >
              {options.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => {
                    onChange(opt.value);
                    setOpen(false);
                  }}
                  className={clsx(
                    "block w-full rounded-[var(--radius-sm)] px-3 py-2 text-left text-[13.5px] transition-colors",
                    opt.value === value
                      ? "bg-[var(--color-accent-soft)] text-[var(--color-accent)]"
                      : "text-[var(--color-text-muted)] hover:bg-white/5 hover:text-[var(--color-text)]",
                  )}
                >
                  {opt.label}
                </button>
              ))}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

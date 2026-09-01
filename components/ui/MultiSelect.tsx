"use client";

import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import clsx from "clsx";
import { Checkbox } from "./Checkbox";

export interface MultiSelectOption {
  value: string;
  label: string;
  color?: string;
}

interface MultiSelectProps {
  label: string;
  options: MultiSelectOption[];
  selected: string[];
  onChange: (values: string[]) => void;
  className?: string;
}

export function MultiSelect({ label, options, selected, onChange, className }: MultiSelectProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

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

  const toggle = (value: string) => {
    if (selected.includes(value)) onChange(selected.filter((v) => v !== value));
    else onChange([...selected, value]);
  };

  const displayLabel =
    selected.length === 0
      ? "Todos"
      : selected.length === 1
        ? selected[0]
        : `${selected.length} selecionados`;

  return (
    <div ref={ref} className={clsx("relative", className)}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        disabled={options.length === 0}
        className={clsx(
          "flex h-10 w-full items-center justify-between gap-2 rounded-[var(--radius-sm)] border px-3.5 text-left text-[13px] transition-colors duration-150",
          open
            ? "border-[var(--color-accent-border)] bg-[var(--color-surface-raised)]"
            : "border-[var(--color-border-strong)] bg-[var(--color-surface)] hover:border-[var(--color-text-faint)]",
          options.length === 0 && "opacity-40",
        )}
      >
        <span className="flex min-w-0 flex-col">
          <span className="truncate text-[11px] leading-tight text-[var(--color-text-faint)]">
            {label}
          </span>
          <span
            className={clsx(
              "truncate leading-tight",
              selected.length ? "text-[var(--color-text)]" : "text-[var(--color-text-muted)]",
            )}
          >
            {displayLabel}
          </span>
        </span>
        <svg
          width="10"
          height="6"
          viewBox="0 0 10 6"
          fill="none"
          className={clsx("shrink-0 transition-transform duration-200", open && "rotate-180")}
        >
          <path d="M1 1L5 5L9 1" stroke="var(--color-text-faint)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -4, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -4, scale: 0.98 }}
            transition={{ duration: 0.14, ease: "easeOut" }}
            className="absolute left-0 top-[calc(100%+6px)] z-40 max-h-[280px] w-[240px] overflow-y-auto rounded-[var(--radius-md)] border border-[var(--color-border-strong)] bg-[var(--color-surface-raised)] p-1.5 shadow-[0_30px_60px_-20px_rgba(0,0,0,0.8)]"
          >
            <button
              type="button"
              onClick={() => onChange([])}
              className="mb-1 w-full rounded-[var(--radius-sm)] px-2.5 py-1.5 text-left text-[12px] text-[var(--color-text-faint)] hover:bg-white/5 hover:text-[var(--color-text-muted)]"
            >
              Limpar seleção
            </button>
            {options.map((opt) => (
              <div
                key={opt.value}
                onClick={() => toggle(opt.value)}
                className="rounded-[var(--radius-sm)] px-2.5 py-2 hover:bg-white/5"
              >
                <Checkbox
                  checked={selected.includes(opt.value)}
                  onChange={() => toggle(opt.value)}
                  label={opt.label}
                  dotColor={opt.color}
                />
              </div>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

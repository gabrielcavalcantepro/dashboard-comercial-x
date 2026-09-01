"use client";

import { motion } from "framer-motion";

export interface RankedBarItem {
  label: string;
  value: number;
  sublabel?: string;
}

interface RankedBarsProps {
  items: RankedBarItem[];
  valueFormatter: (v: number) => string;
  color?: string;
  emptyLabel?: string;
  maxItems?: number;
}

export function RankedBars({
  items,
  valueFormatter,
  color = "var(--color-accent)",
  emptyLabel = "Sem dados no período selecionado.",
  maxItems = 8,
}: RankedBarsProps) {
  if (items.length === 0) {
    return (
      <p className="py-6 text-center text-[13px] text-[var(--color-text-faint)]">{emptyLabel}</p>
    );
  }

  const visiveis = items.slice(0, maxItems);
  const max = Math.max(...visiveis.map((i) => i.value), 1);

  return (
    <div className="flex flex-col gap-3">
      {visiveis.map((item, i) => (
        <div key={item.label}>
          <div className="mb-1.5 flex items-baseline justify-between gap-3">
            <span className="truncate text-[13px] text-[var(--color-text-muted)]">{item.label}</span>
            <span className="shrink-0 text-[13px] font-medium tabular-nums text-[var(--color-text)]">
              {valueFormatter(item.value)}
              {item.sublabel && (
                <span className="ml-1.5 text-[11px] font-normal text-[var(--color-text-faint)]">
                  {item.sublabel}
                </span>
              )}
            </span>
          </div>
          <div className="h-[6px] w-full overflow-hidden rounded-full bg-white/5">
            <motion.div
              initial={{ scaleX: 0 }}
              animate={{ scaleX: 1 }}
              transition={{ duration: 0.6, delay: i * 0.04, ease: [0.16, 1, 0.3, 1] }}
              className="h-full rounded-full"
              style={{
                background: color,
                width: `${(item.value / max) * 100}%`,
                transformOrigin: "left",
              }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}

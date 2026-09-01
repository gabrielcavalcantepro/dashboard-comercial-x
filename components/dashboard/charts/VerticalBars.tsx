"use client";

import { useState } from "react";
import { motion } from "framer-motion";

export interface VerticalBarItem {
  label: string;
  value: number;
}

interface VerticalBarsProps {
  items: VerticalBarItem[];
  valueFormatter?: (v: number) => string;
  color?: string;
}

export function VerticalBars({
  items,
  valueFormatter = (v) => String(v),
  color = "var(--color-accent)",
}: VerticalBarsProps) {
  const [hover, setHover] = useState<number | null>(null);
  const max = Math.max(...items.map((i) => i.value), 1);

  return (
    <div className="flex h-[180px] items-stretch gap-2.5 sm:gap-3.5">
      {items.map((item, i) => (
        <div
          key={item.label}
          className="flex flex-1 flex-col items-center gap-2"
          onMouseEnter={() => setHover(i)}
          onMouseLeave={() => setHover(null)}
        >
          <span
            className="text-[11.5px] font-medium tabular-nums text-[var(--color-text-muted)] transition-opacity duration-150"
            style={{ opacity: hover === i ? 1 : 0.55 }}
          >
            {valueFormatter(item.value)}
          </span>
          <div className="flex w-full flex-1 items-end overflow-hidden rounded-t-[6px] bg-white/[0.04]">
            <motion.div
              initial={{ scaleY: 0 }}
              animate={{ scaleY: 1 }}
              transition={{ duration: 0.55, delay: i * 0.05, ease: [0.16, 1, 0.3, 1] }}
              className="w-full rounded-t-[6px] transition-[filter] duration-150"
              style={{
                background: color,
                filter: hover === i ? "brightness(1.15)" : "brightness(1)",
                height: `${(item.value / max) * 100}%`,
                minHeight: item.value > 0 ? 3 : 0,
                transformOrigin: "bottom",
              }}
            />
          </div>
          <span className="text-[11.5px] text-[var(--color-text-faint)]">{item.label}</span>
        </div>
      ))}
    </div>
  );
}

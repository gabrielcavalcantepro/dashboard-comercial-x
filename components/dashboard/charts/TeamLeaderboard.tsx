"use client";

import { motion } from "framer-motion";
import type { PerformanceVendedor } from "@/lib/metrics";
import { formatCurrency, formatNumber, formatPercent } from "@/lib/format";

interface TeamLeaderboardProps {
  dados: PerformanceVendedor[];
}

export function TeamLeaderboard({ dados }: TeamLeaderboardProps) {
  if (dados.length === 0) {
    return (
      <p className="py-6 text-center text-[13px] text-[var(--color-text-faint)]">
        Sem leads no período selecionado.
      </p>
    );
  }

  const maxLeads = Math.max(...dados.map((d) => d.leads), 1);

  return (
    <div className="overflow-x-auto">
      <div className="grid min-w-[560px] grid-cols-[1.4fr_1.6fr_0.9fr_1fr] gap-x-4 gap-y-1 text-[12px] text-[var(--color-text-faint)]">
        <span className="pb-2">Vendedor</span>
        <span className="pb-2">Leads atendidos</span>
        <span className="pb-2 text-right">Conversão</span>
        <span className="pb-2 text-right">Ticket médio</span>

        {dados.map((v, i) => (
          <motion.div
            key={v.vendedor}
            initial={{ opacity: 0, x: -8 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.4, delay: i * 0.05 }}
            className="col-span-4 grid grid-cols-subgrid items-center border-t border-[var(--color-border)] py-2.5"
          >
            <span className="truncate text-[13.5px] font-medium text-[var(--color-text)]">
              {v.vendedor}
            </span>
            <span className="flex items-center gap-2.5">
              <span className="h-[6px] w-full max-w-[110px] overflow-hidden rounded-full bg-white/5">
                <motion.span
                  initial={{ scaleX: 0 }}
                  animate={{ scaleX: 1 }}
                  transition={{ duration: 0.5, delay: i * 0.05 + 0.1, ease: [0.16, 1, 0.3, 1] }}
                  className="block h-full rounded-full bg-[var(--color-accent)]"
                  style={{ width: `${(v.leads / maxLeads) * 100}%`, transformOrigin: "left" }}
                />
              </span>
              <span className="shrink-0 text-[13px] tabular-nums text-[var(--color-text-muted)]">
                {formatNumber(v.leads)}
              </span>
            </span>
            <span className="text-right text-[13px] tabular-nums text-[var(--color-text)]">
              {formatPercent(v.taxaConversao)}
            </span>
            <span className="text-right text-[13px] tabular-nums text-[var(--color-text)]">
              {formatCurrency(v.ticketMedio)}
            </span>
          </motion.div>
        ))}
      </div>
    </div>
  );
}

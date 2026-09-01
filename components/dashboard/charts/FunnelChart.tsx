"use client";

import { motion } from "framer-motion";
import type { EtapaFunil } from "@/lib/metrics";
import { formatNumber, formatPercent } from "@/lib/format";

interface FunnelChartProps {
  etapas: EtapaFunil[];
}

const CORES = [
  "var(--color-text-faint)",
  "var(--color-avaliando)",
  "var(--color-agendado)",
  "var(--color-comparecido)",
  "var(--color-convertido)",
];

export function FunnelChart({ etapas }: FunnelChartProps) {
  if (!etapas.length || etapas[0].valor === 0) {
    return (
      <p className="py-6 text-center text-[13px] text-[var(--color-text-faint)]">
        Sem leads no período selecionado.
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-1">
      {etapas.map((etapa, i) => (
        <div key={etapa.rotulo}>
          <div className="mb-1.5 flex items-baseline justify-between">
            <span className="text-[13px] text-[var(--color-text-muted)]">{etapa.rotulo}</span>
            <span className="text-[13px] tabular-nums text-[var(--color-text)]">
              <strong className="font-semibold">{formatNumber(etapa.valor)}</strong>
              <span className="ml-1.5 text-[var(--color-text-faint)]">
                {formatPercent(etapa.percentualDoTotal, 0)} do total
              </span>
            </span>
          </div>
          <div className="h-[34px] w-full overflow-hidden rounded-[8px] bg-white/[0.04]">
            <motion.div
              initial={{ scaleX: 0 }}
              animate={{ scaleX: 1 }}
              transition={{ duration: 0.7, delay: i * 0.12, ease: [0.16, 1, 0.3, 1] }}
              className="h-full rounded-[8px]"
              style={{
                background: CORES[i] ?? "var(--color-accent)",
                width: `${Math.max(etapa.percentualDoTotal, 2)}%`,
                transformOrigin: "left",
              }}
            />
          </div>
          {i < etapas.length - 1 && etapas[i + 1].percentualDaEtapaAnterior !== null && (
            <div className="flex items-center gap-2 py-1.5 pl-1 text-[11.5px] text-[var(--color-text-faint)]">
              <svg width="10" height="14" viewBox="0 0 10 14" fill="none">
                <path d="M5 1V13M5 13L1 9M5 13L9 9" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              {formatPercent(etapas[i + 1].percentualDaEtapaAnterior, 0)} seguem para a próxima etapa
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

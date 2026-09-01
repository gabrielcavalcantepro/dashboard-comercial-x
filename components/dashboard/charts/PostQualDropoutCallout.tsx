"use client";

import { motion } from "framer-motion";
import type { DesistenciaPosQualificacao } from "@/lib/metrics";
import { formatNumber, formatPercent } from "@/lib/format";
import { InfoTip } from "@/components/ui/InfoTip";

interface PostQualDropoutCalloutProps {
  dados: DesistenciaPosQualificacao;
}

export function PostQualDropoutCallout({ dados }: PostQualDropoutCalloutProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 18 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-60px" }}
      transition={{ duration: 0.55, ease: [0.16, 1, 0.3, 1] }}
      className="relative flex flex-col justify-between gap-5 overflow-hidden rounded-[var(--radius-lg)] border border-[rgba(255,111,112,0.3)] bg-[linear-gradient(155deg,rgba(255,111,112,0.1),rgba(255,111,112,0.02))] p-6"
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[13px] font-medium text-[var(--color-negative)]">
            O vazamento mais caro do funil
          </p>
          <h3 className="mt-1 text-[15px] text-[var(--color-text)]">Desistência pós-qualificação</h3>
        </div>
        <InfoTip align="right">
          Leads que já foram marcados como qualificados (interesse real confirmado) mas mesmo assim
          desistiram. É o abandono mais custoso porque o lead já tinha demonstrado interesse.
        </InfoTip>
      </div>
      <div className="flex items-end justify-between gap-4">
        <span className="text-[42px] font-semibold leading-none text-[var(--color-negative)]">
          {formatPercent(dados.taxa)}
        </span>
        <span className="mb-1 text-right text-[12.5px] leading-snug text-[var(--color-text-muted)]">
          {formatNumber(dados.qualificadosDesistiram)} de {formatNumber(dados.totalQualificados)}{" "}
          leads qualificados desistiram
        </span>
      </div>
    </motion.div>
  );
}

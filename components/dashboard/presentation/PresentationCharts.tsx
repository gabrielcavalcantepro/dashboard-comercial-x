"use client";

import { Area, AreaChart, ResponsiveContainer, Tooltip, XAxis } from "recharts";
import { motion } from "framer-motion";
import type { EtapaFunil, ContagemItem, PontoEvolucao } from "@/lib/metrics";
import { formatNumber, formatPercent } from "@/lib/format";
import { ChartTooltip } from "../charts/ChartTooltip";

const CORES_FUNIL = [
  "var(--color-text-faint)",
  "var(--color-avaliando)",
  "var(--color-agendado)",
  "var(--color-comparecido)",
  "var(--color-convertido)",
];

// Linhas em flex-1 (não altura fixa) — a quantidade de etapas é sempre
// conhecida e pequena (3 a 5), então isso preenche toda a altura do card
// sem nunca estourar nem sobrar espaço, qualquer que seja a resolução da TV.
export function PresentationFunnel({ etapas }: { etapas: EtapaFunil[] }) {
  if (!etapas.length || etapas[0].valor === 0) {
    return (
      <div className="flex flex-1 items-center justify-center text-[13px] text-[var(--color-text-faint)]">
        Sem leads no período
      </div>
    );
  }

  return (
    <div className="flex flex-1 flex-col justify-between gap-2.5">
      {etapas.map((etapa, i) => (
        <div key={etapa.rotulo} className="flex flex-1 flex-col justify-center">
          <div className="mb-1.5 flex items-baseline justify-between">
            <span className="text-[13px] text-[var(--color-text-muted)]">{etapa.rotulo}</span>
            <span className="text-[13px] tabular-nums text-[var(--color-text)]">
              <strong className="text-[15px] font-semibold">{formatNumber(etapa.valor)}</strong>
              <span className="ml-1.5 text-[var(--color-text-faint)]">
                {formatPercent(etapa.percentualDoTotal, 0)}
              </span>
            </span>
          </div>
          <div className="h-[10px] w-full overflow-hidden rounded-full bg-white/[0.04]">
            <motion.div
              initial={{ scaleX: 0 }}
              animate={{ scaleX: 1 }}
              transition={{ duration: 0.7, delay: i * 0.08, ease: [0.16, 1, 0.3, 1] }}
              className="h-full rounded-full"
              style={{
                background: CORES_FUNIL[i] ?? "var(--color-accent)",
                width: `${Math.max(etapa.percentualDoTotal, 2)}%`,
                transformOrigin: "left",
              }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}

export function PresentationTrend({ dados }: { dados: PontoEvolucao[] }) {
  if (dados.length === 0) {
    return (
      <div className="flex flex-1 items-center justify-center text-[13px] text-[var(--color-text-faint)]">
        Sem leads no período
      </div>
    );
  }

  return (
    <div className="min-h-0 flex-1">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={dados} margin={{ top: 6, right: 4, left: 4, bottom: 0 }}>
          <defs>
            <linearGradient id="gradPresentation" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="var(--color-accent)" stopOpacity={0.35} />
              <stop offset="100%" stopColor="var(--color-accent)" stopOpacity={0} />
            </linearGradient>
          </defs>
          <XAxis
            dataKey="rotulo"
            tick={{ fill: "var(--color-text-faint)", fontSize: 12 }}
            axisLine={false}
            tickLine={false}
            minTickGap={28}
          />
          <Tooltip
            cursor={{ stroke: "rgba(245,244,236,0.15)" }}
            content={<ChartTooltip formatter={(p) => `${p.value} leads`} />}
          />
          <Area
            type="monotone"
            dataKey="total"
            name="Leads"
            stroke="var(--color-accent)"
            strokeWidth={2.5}
            fill="url(#gradPresentation)"
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

// Sempre corta para os `max` primeiros itens (já vêm ordenados por valor
// decrescente) e distribui as linhas em flex-1 — garante altura previsível
// e sem overflow independente de quantas fontes/procedimentos existirem.
export function PresentationRanked({
  items,
  color = "var(--color-accent)",
  max = 4,
}: {
  items: ContagemItem[];
  color?: string;
  max?: number;
}) {
  const visiveis = items.slice(0, max);
  if (visiveis.length === 0) {
    return (
      <div className="flex flex-1 items-center justify-center text-[12.5px] text-[var(--color-text-faint)]">
        Sem dados
      </div>
    );
  }
  const total = Math.max(...visiveis.map((i) => i.total), 1);

  return (
    <div className="flex flex-1 flex-col justify-between gap-2">
      {visiveis.map((item, i) => (
        <div key={item.chave} className="flex flex-1 flex-col justify-center">
          <div className="mb-1 flex items-baseline justify-between gap-2">
            <span className="truncate text-[12.5px] text-[var(--color-text-muted)]">{item.chave}</span>
            <span className="shrink-0 text-[12.5px] font-medium tabular-nums text-[var(--color-text)]">
              {formatNumber(item.total)}
            </span>
          </div>
          <div className="h-[7px] w-full overflow-hidden rounded-full bg-white/5">
            <motion.div
              initial={{ scaleX: 0 }}
              animate={{ scaleX: 1 }}
              transition={{ duration: 0.6, delay: i * 0.04, ease: [0.16, 1, 0.3, 1] }}
              className="h-full rounded-full"
              style={{ background: color, width: `${(item.total / total) * 100}%`, transformOrigin: "left" }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}

"use client";

import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { PontoEvolucao } from "@/lib/metrics";
import { ChartTooltip } from "./ChartTooltip";

interface ConversionTrendChartProps {
  dados: PontoEvolucao[];
}

export function ConversionTrendChart({ dados }: ConversionTrendChartProps) {
  if (dados.length === 0) {
    return (
      <p className="py-6 text-center text-[13px] text-[var(--color-text-faint)]">
        Sem leads no período selecionado.
      </p>
    );
  }

  return (
    <>
      <ResponsiveContainer width="100%" height={200}>
        <LineChart data={dados} margin={{ top: 6, right: 8, left: -18, bottom: 0 }}>
          <CartesianGrid strokeDasharray="0" vertical={false} stroke="rgba(245,244,236,0.06)" />
          <XAxis
            dataKey="rotulo"
            tick={{ fill: "var(--color-text-faint)", fontSize: 11 }}
            axisLine={false}
            tickLine={false}
            minTickGap={24}
          />
          <YAxis
            tick={{ fill: "var(--color-text-faint)", fontSize: 11 }}
            axisLine={false}
            tickLine={false}
            width={34}
            tickFormatter={(v) => `${v}%`}
          />
          <Tooltip
            cursor={{ stroke: "rgba(245,244,236,0.15)" }}
            content={
              <ChartTooltip
                formatter={(p) => `${p.name}: ${typeof p.value === "number" ? p.value.toFixed(1).replace(".", ",") : p.value}%`}
              />
            }
          />
          <Line
            type="monotone"
            dataKey="taxaQualificacao"
            name="Qualificação"
            stroke="var(--color-avaliando)"
            strokeWidth={2}
            dot={false}
            activeDot={{ r: 4, strokeWidth: 2, stroke: "var(--color-base)" }}
            connectNulls
          />
          <Line
            type="monotone"
            dataKey="taxaAgendamento"
            name="Agendamento"
            stroke="var(--color-accent)"
            strokeWidth={2}
            dot={false}
            activeDot={{ r: 4, strokeWidth: 2, stroke: "var(--color-base)" }}
            connectNulls
          />
        </LineChart>
      </ResponsiveContainer>
      <div className="mt-1 flex items-center gap-4 text-[11.5px] text-[var(--color-text-faint)]">
        <span className="flex items-center gap-1.5">
          <span className="h-[7px] w-[7px] rounded-full" style={{ background: "var(--color-avaliando)" }} />
          Taxa de qualificação
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-[7px] w-[7px] rounded-full" style={{ background: "var(--color-accent)" }} />
          Taxa de agendamento
        </span>
      </div>
    </>
  );
}

"use client";

import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { PontoEvolucao } from "@/lib/metrics";
import { ChartTooltip } from "./ChartTooltip";

interface LeadsEvolutionChartProps {
  dados: PontoEvolucao[];
}

export function LeadsEvolutionChart({ dados }: LeadsEvolutionChartProps) {
  if (dados.length === 0) {
    return (
      <p className="py-6 text-center text-[13px] text-[var(--color-text-faint)]">
        Sem leads no período selecionado.
      </p>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={220}>
      <AreaChart data={dados} margin={{ top: 6, right: 8, left: -18, bottom: 0 }}>
        <defs>
          <linearGradient id="gradLeads" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--color-accent)" stopOpacity={0.32} />
            <stop offset="100%" stopColor="var(--color-accent)" stopOpacity={0} />
          </linearGradient>
        </defs>
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
          allowDecimals={false}
          width={30}
        />
        <Tooltip
          cursor={{ stroke: "rgba(245,244,236,0.15)" }}
          content={
            <ChartTooltip formatter={(p) => `${p.value} leads`} />
          }
        />
        <Area
          type="monotone"
          dataKey="total"
          name="Leads"
          stroke="var(--color-accent)"
          strokeWidth={2}
          fill="url(#gradLeads)"
          activeDot={{ r: 4, fill: "var(--color-accent)", stroke: "var(--color-base)", strokeWidth: 2 }}
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}

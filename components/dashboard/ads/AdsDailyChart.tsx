"use client";

import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import type { MetaPontoDiario } from "@/lib/meta-types";
import { formatCurrency, formatDayMonthShort, formatNumber } from "@/lib/format";

interface AdsDailyChartProps {
  dados: MetaPontoDiario[];
}

function TooltipDiario({
  active,
  payload,
}: {
  active?: boolean;
  payload?: { payload: MetaPontoDiario }[];
}) {
  if (!active || !payload?.length) return null;
  const ponto = payload[0].payload;
  return (
    <div className="rounded-[10px] border border-[var(--color-border-strong)] bg-[var(--color-surface-raised)] px-3.5 py-2.5 text-[12.5px] shadow-[0_25px_50px_-20px_rgba(0,0,0,0.85)]">
      <div className="mb-1.5 text-[var(--color-text-faint)]">{formatDayMonthShort(ponto.data)}</div>
      <div className="flex flex-col gap-1">
        <div className="flex items-center gap-1.5 text-[var(--color-text)]">
          <span className="h-[6px] w-[6px] shrink-0 rounded-full" style={{ background: "var(--color-accent)" }} />
          Investimento: {formatCurrency(ponto.spend, true)}
        </div>
        <div className="text-[var(--color-text-muted)]">Impressões: {formatNumber(ponto.impressions)}</div>
        <div className="text-[var(--color-text-muted)]">Cliques: {formatNumber(ponto.clicks)}</div>
        <div className="text-[var(--color-text-muted)]">Conversas: {formatNumber(ponto.conversas)}</div>
      </div>
    </div>
  );
}

export function AdsDailyChart({ dados }: AdsDailyChartProps) {
  if (dados.length === 0) {
    return (
      <p className="py-6 text-center text-[13px] text-[var(--color-text-faint)]">
        Sem dados de anúncios no período selecionado.
      </p>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={220}>
      <AreaChart data={dados} margin={{ top: 6, right: 8, left: -18, bottom: 0 }}>
        <defs>
          <linearGradient id="gradSpend" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--color-accent)" stopOpacity={0.32} />
            <stop offset="100%" stopColor="var(--color-accent)" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="0" vertical={false} stroke="rgba(245,244,236,0.06)" />
        <XAxis
          dataKey="data"
          tickFormatter={(v) => formatDayMonthShort(v)}
          tick={{ fill: "var(--color-text-faint)", fontSize: 11 }}
          axisLine={false}
          tickLine={false}
          minTickGap={24}
        />
        <YAxis
          tick={{ fill: "var(--color-text-faint)", fontSize: 11 }}
          axisLine={false}
          tickLine={false}
          width={46}
          tickFormatter={(v) => formatCurrency(v)}
        />
        <Tooltip cursor={{ stroke: "rgba(245,244,236,0.15)" }} content={<TooltipDiario />} />
        <Area
          type="monotone"
          dataKey="spend"
          name="Investimento"
          stroke="var(--color-accent)"
          strokeWidth={2}
          fill="url(#gradSpend)"
          activeDot={{ r: 4, fill: "var(--color-accent)", stroke: "var(--color-base)", strokeWidth: 2 }}
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}

"use client";

import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import clsx from "clsx";
import type { MetaCampanhaInsight } from "@/lib/meta-types";
import { formatCurrency, formatNumber } from "@/lib/format";

interface AdsCampaignBreakdownProps {
  campanhas: MetaCampanhaInsight[];
}

export function AdsCampaignBreakdown({ campanhas }: AdsCampaignBreakdownProps) {
  const objetivos = useMemo(
    () => Array.from(new Set(campanhas.map((c) => c.objectiveLabel))).sort(),
    [campanhas],
  );
  const [filtro, setFiltro] = useState<string | null>(null);

  const visiveis = filtro ? campanhas.filter((c) => c.objectiveLabel === filtro) : campanhas;

  if (campanhas.length === 0) {
    return (
      <p className="py-6 text-center text-[13px] text-[var(--color-text-faint)]">
        Sem campanhas com investimento no período selecionado.
      </p>
    );
  }

  return (
    <div>
      {objetivos.length > 1 && (
        <div className="mb-4 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setFiltro(null)}
            className={clsx(
              "rounded-full border px-3 py-1.5 text-[12.5px] transition-colors",
              filtro === null
                ? "border-[var(--color-accent-border)] bg-[var(--color-accent-soft)] text-[var(--color-accent)]"
                : "border-[var(--color-border-strong)] text-[var(--color-text-muted)] hover:text-[var(--color-text)]",
            )}
          >
            Todos
          </button>
          {objetivos.map((obj) => (
            <button
              key={obj}
              type="button"
              onClick={() => setFiltro(obj)}
              className={clsx(
                "rounded-full border px-3 py-1.5 text-[12.5px] transition-colors",
                filtro === obj
                  ? "border-[var(--color-accent-border)] bg-[var(--color-accent-soft)] text-[var(--color-accent)]"
                  : "border-[var(--color-border-strong)] text-[var(--color-text-muted)] hover:text-[var(--color-text)]",
              )}
            >
              {obj}
            </button>
          ))}
        </div>
      )}

      <div className="overflow-x-auto">
        <div className="grid min-w-[620px] grid-cols-[1.6fr_1fr_1fr_1fr_1fr] gap-x-4 gap-y-1 text-[12px] text-[var(--color-text-faint)]">
          <span className="pb-2">Campanha</span>
          <span className="pb-2">Objetivo</span>
          <span className="pb-2 text-right">Investimento</span>
          <span className="pb-2 text-right">Conversas</span>
          <span className="pb-2 text-right">Custo/conversa</span>

          {visiveis.map((c, i) => (
            <motion.div
              key={c.campaignId}
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.4, delay: i * 0.04 }}
              className="col-span-5 grid grid-cols-subgrid items-center border-t border-[var(--color-border)] py-2.5"
            >
              <span className="truncate text-[13.5px] font-medium text-[var(--color-text)]">
                {c.campaignName}
              </span>
              <span className="truncate text-[13px] text-[var(--color-text-muted)]">
                {c.objectiveLabel}
              </span>
              <span className="text-right text-[13px] tabular-nums text-[var(--color-text)]">
                {formatCurrency(c.spend, true)}
              </span>
              <span className="text-right text-[13px] tabular-nums text-[var(--color-text)]">
                {formatNumber(c.conversas)}
              </span>
              <span className="text-right text-[13px] tabular-nums text-[var(--color-text)]">
                {c.conversas > 0 ? formatCurrency(c.spend / c.conversas, true) : "—"}
              </span>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  );
}

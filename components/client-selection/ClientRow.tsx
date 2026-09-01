"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import Link from "next/link";
import type { ClientePublico, Lead } from "@/lib/types";
import { addDaysISO, toISODate } from "@/lib/format";
import { ClientFormModal } from "./ClientFormModal";

interface ClientRowProps {
  cliente: ClientePublico;
  index: number;
}

export function ClientRow({ cliente, index }: ClientRowProps) {
  const [leadsRecentes, setLeadsRecentes] = useState<number | null>(null);
  const [erro, setErro] = useState(false);
  const [editando, setEditando] = useState(false);

  useEffect(() => {
    let ativo = true;
    fetch(`/api/clientes/${cliente.id}/leads`)
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((data: { leads: Lead[] }) => {
        if (!ativo) return;
        const hoje = toISODate(new Date());
        // Janela rolante de 30 dias em vez de mês-calendário: evita mostrar
        // "0" logo após virar o mês mesmo com atividade recente de sobra.
        const inicio = addDaysISO(hoje, -29);
        const count = data.leads.filter(
          (l) => l.dataContato && l.dataContato >= inicio && l.dataContato <= hoje,
        ).length;
        setLeadsRecentes(count);
      })
      .catch(() => ativo && setErro(true));
    return () => {
      ativo = false;
    };
  }, [cliente.id]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: Math.min(index * 0.05, 0.4), ease: [0.16, 1, 0.3, 1] }}
    >
      <Link
        href={`/clientes/${cliente.id}`}
        className="group relative flex items-center justify-between gap-6 overflow-hidden rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface)] px-5 py-6 transition-colors duration-300 hover:border-[var(--color-border-strong)]"
      >
        <span
          aria-hidden
          className="pointer-events-none absolute inset-0 rounded-[var(--radius-lg)] opacity-0 transition-opacity duration-500 ease-[var(--ease-out-soft)] group-hover:opacity-100"
          style={{
            background:
              "radial-gradient(circle at 0% 50%, rgba(250,210,20,0.12), transparent 75%)",
          }}
        />
        <div className="relative z-10 flex min-w-0 flex-col justify-center">
          <div className="flex items-center gap-3">
            <h3 className="truncate text-[22px] font-semibold leading-none text-[var(--color-text)] sm:text-[26px]">
              {cliente.nome}
            </h3>
            <span className="hidden shrink-0 rounded-full border border-[var(--color-border-strong)] px-2.5 py-0.5 text-[11px] leading-none text-[var(--color-text-muted)] sm:inline-block">
              {cliente.segmento}
            </span>
          </div>
          <span className="mt-2 block text-[13px] leading-none text-[var(--color-text-faint)] sm:hidden">
            {cliente.segmento}
          </span>
        </div>

        <div className="relative z-10 flex shrink-0 items-center gap-5">
          <div className="text-right">
            <div className="text-[20px] font-semibold tabular-nums text-[var(--color-text)]">
              {erro ? "—" : leadsRecentes === null ? (
                <span className="inline-block h-[22px] w-8 animate-pulse rounded bg-white/10" />
              ) : (
                leadsRecentes
              )}
            </div>
            <div className="text-[11px] text-[var(--color-text-faint)]">últimos 30 dias</div>
          </div>
          <button
            type="button"
            aria-label={`Editar ${cliente.nome}`}
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              setEditando(true);
            }}
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[var(--color-text-faint)] opacity-0 transition-all duration-150 hover:bg-white/5 hover:text-[var(--color-text)] focus-visible:opacity-100 group-hover:opacity-100"
          >
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <path
                d="M9.5 1.5L12.5 4.5L4.5 12.5H1.5V9.5L9.5 1.5Z"
                stroke="currentColor"
                strokeWidth="1.3"
                strokeLinejoin="round"
              />
            </svg>
          </button>
          <svg
            width="9"
            height="15"
            viewBox="0 0 9 15"
            fill="none"
            className="shrink-0 text-[var(--color-text-faint)] transition-all duration-200 group-hover:translate-x-1 group-hover:text-[var(--color-accent)]"
          >
            <path d="M1 1L7.5 7.5L1 14" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>
      </Link>
      <ClientFormModal open={editando} onClose={() => setEditando(false)} cliente={cliente} />
    </motion.div>
  );
}

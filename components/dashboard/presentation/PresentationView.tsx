"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import clsx from "clsx";
import type { ClientePublico } from "@/lib/types";
import type { EtapaFunil, ContagemItem, KpiValues, PontoEvolucao } from "@/lib/metrics";
import { formatCurrency, formatNumber, formatPercent, formatRelativeTime } from "@/lib/format";
import { Card } from "@/components/ui/Card";
import { PresentationFunnel, PresentationRanked, PresentationTrend } from "./PresentationCharts";

interface PresentationViewProps {
  cliente: ClientePublico;
  kpis: KpiValues;
  funil: EtapaFunil[];
  evolucao: PontoEvolucao[];
  porFonte: ContagemItem[];
  porProcedimento: ContagemItem[];
  atualizadoEm: number | null;
  onSair: () => void;
}

function Relogio() {
  // PresentationView só monta no cliente, depois de um clique — nunca faz
  // parte do HTML gerado no servidor — então inicializar com a hora atual
  // aqui não corre risco de mismatch de hidratação.
  const [agora, setAgora] = useState(() => new Date());
  useEffect(() => {
    const id = setInterval(() => setAgora(new Date()), 1000);
    return () => clearInterval(id);
  }, []);
  return (
    <span className="text-[28px] font-semibold tabular-nums leading-none text-[var(--color-text)]">
      {agora.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
    </span>
  );
}

function KpiTile({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex min-h-0 min-w-0 flex-col justify-center gap-1 rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface)] px-3.5 py-2">
      <span className="truncate text-[11px] text-[var(--color-text-muted)]">{label}</span>
      <span className="truncate text-[20px] font-semibold leading-none tabular-nums text-[var(--color-text)]">
        {value}
      </span>
    </div>
  );
}

export function PresentationView({
  cliente,
  kpis,
  funil,
  evolucao,
  porFonte,
  porProcedimento,
  atualizadoEm,
  onSair,
}: PresentationViewProps) {
  const [mostrarSair, setMostrarSair] = useState(false);
  const [agoraMs, setAgoraMs] = useState(() => Date.now());

  useEffect(() => {
    const id = setInterval(() => setAgoraMs(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    const LIMIAR_PX = 90;
    const aoMoverMouse = (e: MouseEvent) => {
      setMostrarSair(e.clientY >= window.innerHeight - LIMIAR_PX);
    };
    window.addEventListener("mousemove", aoMoverMouse);
    return () => window.removeEventListener("mousemove", aoMoverMouse);
  }, []);

  // Rede de segurança independente da Fullscreen API: se o navegador negar
  // ou não suportar tela cheia, Esc ainda precisa fechar o modo.
  useEffect(() => {
    const aoTeclar = (e: KeyboardEvent) => {
      if (e.key === "Escape") onSair();
    };
    window.addEventListener("keydown", aoTeclar);
    return () => window.removeEventListener("keydown", aoTeclar);
  }, [onSair]);

  return (
    <div className="fixed inset-0 z-[100] flex h-dvh w-dvw flex-col overflow-hidden bg-[var(--color-base)] p-7">
      <header className="mb-5 flex shrink-0 items-center justify-between gap-6">
        <div className="flex items-center gap-3.5">
          <h1 className="text-[26px] font-semibold leading-none text-[var(--color-text)]">
            {cliente.nome}
          </h1>
          <span className="rounded-full border border-[var(--color-border-strong)] px-2.5 py-1 text-[12px] leading-none text-[var(--color-text-muted)]">
            {cliente.segmento}
          </span>
          <div className="ml-1 flex items-center gap-1.5 text-[12.5px] text-[var(--color-text-faint)]">
            <span
              className="h-[6px] w-[6px] rounded-full bg-[var(--color-positive)]"
              style={{ animation: "pulse-dot 2s ease-in-out infinite" }}
            />
            <span>
              {atualizadoEm ? `Atualizado ${formatRelativeTime(atualizadoEm, agoraMs)}` : "Ao vivo"}
            </span>
          </div>
        </div>
        <Relogio />
      </header>

      <div className="grid min-h-0 flex-1 grid-rows-[1.4fr_1fr] gap-4">
        <div className="grid min-h-0 grid-cols-[300px_1fr] gap-4">
          <div className="grid min-h-0 grid-cols-2 grid-rows-3 gap-3">
            <KpiTile label="Total de leads" value={formatNumber(kpis.totalLeads)} />
            <KpiTile label="Qualificados" value={formatNumber(kpis.qualificados)} />
            <KpiTile label="Agendamentos" value={formatNumber(kpis.agendamentos)} />
            <KpiTile label="Taxa de agend." value={formatPercent(kpis.taxaAgendamento)} />
            <KpiTile label="Receita proj." value={formatCurrency(kpis.receitaProjetada)} />
            <KpiTile label="Ticket médio" value={formatCurrency(kpis.ticketMedio)} />
          </div>

          <Card className="flex min-h-0 flex-col p-5">
            <h3 className="mb-4 shrink-0 text-[14.5px] font-medium text-[var(--color-text)]">
              Evolução de leads
            </h3>
            <PresentationTrend dados={evolucao} />
          </Card>
        </div>

        <div className="grid min-h-0 grid-cols-3 gap-4">
          <Card className="flex min-h-0 flex-col p-5">
            <h3 className="mb-3 shrink-0 text-[14.5px] font-medium text-[var(--color-text)]">
              Funil de conversão
            </h3>
            <PresentationFunnel etapas={funil} />
          </Card>
          <Card className="flex min-h-0 flex-col p-5">
            <h3 className="mb-3 shrink-0 text-[14.5px] font-medium text-[var(--color-text)]">
              Leads por fonte
            </h3>
            <PresentationRanked items={porFonte} />
          </Card>
          <Card className="flex min-h-0 flex-col p-5">
            <h3 className="mb-3 shrink-0 text-[14.5px] font-medium text-[var(--color-text)]">
              Leads por procedimento
            </h3>
            <PresentationRanked items={porProcedimento} color="var(--color-avaliando)" />
          </Card>
        </div>
      </div>

      <AnimatePresence>
        {mostrarSair && (
          <motion.button
            type="button"
            onClick={onSair}
            initial={{ opacity: 0, y: 60 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 60 }}
            transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
            className={clsx(
              "fixed bottom-7 left-1/2 z-[110] -translate-x-1/2",
              "flex items-center gap-2.5 rounded-full border border-[var(--color-border-strong)]",
              "bg-[var(--color-surface-raised)] px-6 py-3.5 text-[13.5px] font-medium text-[var(--color-text)]",
              "shadow-[0_25px_60px_-18px_rgba(0,0,0,0.9)] transition-colors hover:border-[var(--color-accent-border)] hover:text-[var(--color-accent)]",
            )}
          >
            <svg width="13" height="13" viewBox="0 0 16 16" fill="none">
              <path
                d="M14.5 10.5V13.5C14.5 14.0523 14.0523 14.5 13.5 14.5H10.5M5.5 14.5H2.5C1.94772 14.5 1.5 14.0523 1.5 13.5V10.5M1.5 5.5V2.5C1.5 1.94772 1.94772 1.5 2.5 1.5H5.5M10.5 1.5H13.5C14.0523 1.5 14.5 1.94772 14.5 2.5V5.5"
                stroke="currentColor"
                strokeWidth="1.4"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
            Sair do modo apresentação
          </motion.button>
        )}
      </AnimatePresence>
    </div>
  );
}

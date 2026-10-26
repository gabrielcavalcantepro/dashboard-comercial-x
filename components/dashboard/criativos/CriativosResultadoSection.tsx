"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import type { CriativosResumo, ResultadoCriativo } from "@/lib/metrics";
import { formatNumber, formatPercent } from "@/lib/format";
import { Card } from "@/components/ui/Card";
import { InfoTip } from "@/components/ui/InfoTip";
import { SectionHeading } from "@/components/ui/SectionHeading";

interface CriativosResultadoSectionProps {
  resumo: CriativosResumo;
}

const VISIVEIS_INICIAL = 8;

function Miniatura({ criativo }: { criativo: ResultadoCriativo }) {
  // A miniatura vem de um link temporário do Meta, que expira depois de
  // algumas semanas — quando quebra, mostra o tipo de mídia no lugar.
  const [quebrou, setQuebrou] = useState(false);
  const { miniatura, tipoMidia } = criativo.anuncio;
  return (
    <div className="h-[72px] w-[58px] shrink-0 overflow-hidden rounded-[var(--radius-sm)] bg-[var(--color-surface-sunken)]">
      {miniatura && !quebrou ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={miniatura}
          alt=""
          className="h-full w-full object-cover"
          onError={() => setQuebrou(true)}
        />
      ) : (
        <div className="flex h-full w-full items-center justify-center text-[10px] text-[var(--color-text-faint)]">
          {tipoMidia === "video" ? "Vídeo" : "Imagem"}
        </div>
      )}
    </div>
  );
}

function Numero({ label, value, cor }: { label: string; value: string; cor?: string }) {
  return (
    <div>
      <div className="text-[10.5px] text-[var(--color-text-faint)]">{label}</div>
      <div className="text-[14px] font-medium tabular-nums" style={{ color: cor ?? "var(--color-text)" }}>
        {value}
      </div>
    </div>
  );
}

function LinhaCriativo({ criativo, index }: { criativo: ResultadoCriativo; index: number }) {
  const { anuncio } = criativo;
  const descricao = anuncio.texto || anuncio.titulo || "Anúncio sem texto";
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-40px" }}
      transition={{ duration: 0.4, delay: Math.min(index * 0.03, 0.3) }}
    >
      <Card className="flex flex-col gap-4 p-4 lg:flex-row lg:items-center">
        <div className="flex min-w-0 flex-1 items-center gap-3.5">
          <Miniatura criativo={criativo} />
          <div className="min-w-0">
            <p className="line-clamp-2 text-[13px] leading-snug text-[var(--color-text)]" title={descricao}>
              {descricao}
            </p>
            <a
              href={anuncio.url}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-1 inline-block text-[12px] text-[var(--color-text-faint)] underline-offset-2 hover:text-[var(--color-accent)] hover:underline"
            >
              Ver post do anúncio
            </a>
          </div>
        </div>
        <div className="grid shrink-0 grid-cols-3 gap-x-5 gap-y-3 sm:grid-cols-6 lg:w-[460px]">
          <Numero label="Leads" value={formatNumber(criativo.leads)} />
          <Numero label="Qualificados" value={formatNumber(criativo.qualificados)} />
          <Numero label="Agendados" value={formatNumber(criativo.agendados)} cor="var(--color-agendado)" />
          <Numero label="Compareceram" value={formatNumber(criativo.comparecidos)} cor="var(--color-comparecido)" />
          <Numero label="Converteram" value={formatNumber(criativo.convertidos)} cor="var(--color-convertido)" />
          <Numero label="Taxa agend." value={formatPercent(criativo.taxaAgendamento, 0)} />
        </div>
      </Card>
    </motion.div>
  );
}

export function CriativosResultadoSection({ resumo }: CriativosResultadoSectionProps) {
  const [verTodos, setVerTodos] = useState(false);
  const { criativos, semAnuncio, pendentes } = resumo;
  const comAnuncio = criativos.reduce((s, c) => s + c.leads, 0);
  const visiveis = verTodos ? criativos : criativos.slice(0, VISIVEIS_INICIAL);

  return (
    <section className="mb-12">
      <SectionHeading
        title="Criativos que trazem resultado"
        description="o anúncio que levou cada lead a chamar no WhatsApp"
        action={
          <InfoTip align="right">
            O Meta informa na primeira mensagem do lead qual anúncio de clique para WhatsApp ele clicou.
            Leads orgânicos, de indicação ou que chamaram sem passar pelo anúncio ficam como &quot;sem
            anúncio&quot;. Vale o último anúncio clicado. Com período selecionado, cada etapa conta quem a
            atingiu no período.
          </InfoTip>
        }
      />

      <p className="mb-4 text-[12.5px] text-[var(--color-text-faint)]">
        {formatNumber(comAnuncio)} leads com anúncio identificado · {formatNumber(semAnuncio)} sem anúncio
        {pendentes > 0 && <> · lendo a origem de mais {formatNumber(pendentes)} no CRM</>}
      </p>

      {criativos.length === 0 ? (
        <Card className="px-5 py-8 text-center text-[13px] text-[var(--color-text-faint)]">
          {pendentes > 0
            ? "Lendo no CRM o anúncio de origem dos leads — os criativos aparecem aqui em instantes."
            : "Nenhum lead do período chegou por anúncio de clique para WhatsApp."}
        </Card>
      ) : (
        <div className="flex flex-col gap-2.5">
          {visiveis.map((c, i) => (
            <LinhaCriativo key={c.anuncio.url} criativo={c} index={i} />
          ))}
          {criativos.length > VISIVEIS_INICIAL && (
            <button
              type="button"
              onClick={() => setVerTodos((v) => !v)}
              className="mt-1 self-center rounded-full px-4 py-2 text-[13px] text-[var(--color-text-muted)] transition-colors hover:bg-white/5 hover:text-[var(--color-text)]"
            >
              {verTodos ? "Mostrar menos" : `Ver todos os ${criativos.length} criativos`}
            </button>
          )}
        </div>
      )}
    </section>
  );
}

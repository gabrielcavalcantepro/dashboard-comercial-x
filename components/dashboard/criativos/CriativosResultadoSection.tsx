"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import type { CriativosResumo, FunilOrigem, ResultadoCriativo } from "@/lib/metrics";
import { formatDayMonth, formatNumber, formatPercent } from "@/lib/format";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { ChartPanel } from "../charts/ChartPanel";

interface CriativosResultadoSectionProps {
  resumo: CriativosResumo;
}

const VISIVEIS_INICIAL = 8;

function Miniatura({ resultado }: { resultado: ResultadoCriativo }) {
  // Link do Meta que expirou antes de ser arquivado: mostra o tipo de mídia.
  // Guarda qual endereço falhou (e não só "falhou") para tentar de novo
  // quando a atualização do painel trouxer a cópia arquivada.
  const [falhou, setFalhou] = useState<string | null>(null);
  const { miniatura, tipoMidia } = resultado.criativo;
  return (
    <span className="block h-[56px] w-[44px] shrink-0 overflow-hidden rounded-[var(--radius-sm)] bg-[var(--color-surface-sunken)]">
      {miniatura && miniatura !== falhou ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={miniatura} alt="" className="h-full w-full object-cover" onError={() => setFalhou(miniatura)} />
      ) : (
        <span className="flex h-full w-full items-center justify-center text-[10px] text-[var(--color-text-faint)]">
          {tipoMidia === "video" ? "Vídeo" : "Imagem"}
        </span>
      )}
    </span>
  );
}

function periodoNoAr(r: ResultadoCriativo): string | null {
  if (!r.primeiroLead || !r.ultimoLead) return null;
  if (r.primeiroLead === r.ultimoLead) return formatDayMonth(r.primeiroLead);
  return `${formatDayMonth(r.primeiroLead)} – ${formatDayMonth(r.ultimoLead)}`;
}

function Celula({ valor, cor }: { valor: number; cor: string }) {
  return (
    <span
      className="text-right text-[13px] tabular-nums"
      style={{ color: valor > 0 ? cor : "var(--color-text-faint)" }}
    >
      {formatNumber(valor)}
    </span>
  );
}

// Uma linha da tabela: a primeira coluna (o que identifica a origem) muda;
// o funil ao lado é o mesmo para criativos e para "sem anúncio".
function LinhaFunil({
  origem,
  funil,
  maxLeads,
  index,
  corBarra = "var(--color-accent)",
}: {
  origem: React.ReactNode;
  funil: FunilOrigem;
  maxLeads: number;
  index: number;
  corBarra?: string;
}) {
  const atraso = Math.min(index * 0.05, 0.4);
  return (
    <motion.div
      initial={{ opacity: 0, x: -8 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.4, delay: atraso }}
      className="col-span-7 grid grid-cols-subgrid items-center border-t border-[var(--color-border)] py-3"
    >
      {origem}
      <span className="flex items-center gap-2.5">
        <span className="h-[6px] w-full max-w-[90px] overflow-hidden rounded-full bg-white/5">
          <motion.span
            initial={{ scaleX: 0 }}
            animate={{ scaleX: 1 }}
            transition={{ duration: 0.5, delay: atraso + 0.1, ease: [0.16, 1, 0.3, 1] }}
            className="block h-full rounded-full"
            style={{
              width: `${(funil.leads / maxLeads) * 100}%`,
              transformOrigin: "left",
              background: corBarra,
            }}
          />
        </span>
        <span className="shrink-0 text-[13px] tabular-nums text-[var(--color-text-muted)]">
          {formatNumber(funil.leads)}
        </span>
      </span>
      <Celula valor={funil.qualificados} cor="var(--color-text)" />
      <Celula valor={funil.agendados} cor="var(--color-agendado)" />
      <Celula valor={funil.comparecidos} cor="var(--color-comparecido)" />
      <Celula valor={funil.convertidos} cor="var(--color-convertido)" />
      <span className="text-right text-[13px] tabular-nums text-[var(--color-text)]">
        {formatPercent(funil.taxaAgendamento, 0)}
      </span>
    </motion.div>
  );
}

function OrigemCriativo({ resultado }: { resultado: ResultadoCriativo }) {
  const { criativo } = resultado;
  const descricao = criativo.texto || criativo.titulo || "Anúncio sem texto";
  const periodo = periodoNoAr(resultado);
  return (
    <span className="flex min-w-0 items-center gap-3">
      <Miniatura resultado={resultado} />
      <span className="min-w-0">
        <span className="line-clamp-2 text-[13px] leading-snug text-[var(--color-text)]" title={descricao}>
          {descricao}
        </span>
        <span className="mt-1 flex flex-wrap items-center gap-x-1.5 gap-y-1 text-[11.5px]">
          {criativo.ativo !== null && (
            <span
              className="rounded-full border px-1.5 py-px text-[10.5px] leading-none"
              style={
                criativo.ativo
                  ? { borderColor: "var(--color-accent-border)", color: "var(--color-accent)" }
                  : { borderColor: "var(--color-border-strong)", color: "var(--color-text-faint)" }
              }
            >
              {criativo.ativo ? "no ar" : "pausado"}
            </span>
          )}
          {periodo && <span>{periodo}</span>}
          {periodo && <span aria-hidden>·</span>}
          {criativo.variacoes && (
            <>
              <span title="Anúncios de imagem com o mesmo texto não têm como ser separados pela mensagem do WhatsApp.">
                {criativo.variacoes} imagens
              </span>
              <span aria-hidden>·</span>
            </>
          )}
          {criativo.posts === 0 ? (
            <span>nenhum lead no CRM</span>
          ) : (
            <span>{criativo.posts > 1 ? `${criativo.posts} posts` : "1 post"}</span>
          )}
          {criativo.url && <span aria-hidden>·</span>}
          {criativo.url && (
            <a
              href={criativo.url}
              target="_blank"
              rel="noopener noreferrer"
              className="underline-offset-2 hover:text-[var(--color-accent)] hover:underline"
            >
              ver post
            </a>
          )}
        </span>
      </span>
    </span>
  );
}

function OrigemSemAnuncio() {
  return (
    <span className="flex min-w-0 items-center gap-3">
      <span className="flex h-[56px] w-[44px] shrink-0 items-center justify-center rounded-[var(--radius-sm)] border border-dashed border-[var(--color-border-strong)] text-[16px] text-[var(--color-text-faint)]">
        —
      </span>
      <span className="min-w-0">
        <span className="block text-[13px] leading-snug text-[var(--color-text-muted)]">
          Sem anúncio identificado
        </span>
        <span className="mt-1 block text-[11.5px]">orgânico, indicação ou chamou sem clicar no anúncio</span>
      </span>
    </span>
  );
}

export function CriativosResultadoSection({ resumo }: CriativosResultadoSectionProps) {
  const [verTodos, setVerTodos] = useState(false);
  const { criativos, semAnuncio, pendentes } = resumo;
  const comAnuncio = criativos.reduce((s, c) => s + c.leads, 0);
  const maxLeads = Math.max(...criativos.map((c) => c.leads), semAnuncio.leads, 1);
  const visiveis = verTodos ? criativos : criativos.slice(0, VISIVEIS_INICIAL);
  const temLinhas = criativos.length > 0 || semAnuncio.leads > 0;

  return (
    <section className="mt-12">
      <SectionHeading title="Criativos" description="o anúncio que levou cada lead a chamar no WhatsApp" />
      <ChartPanel
        title="Resultado por criativo"
        tooltip="O Meta informa qual anúncio de clique para WhatsApp o lead clicou antes de chamar. Os posts do mesmo vídeo ou imagem (Instagram, Facebook e um por anúncio) contam juntos. A última linha reúne os leads sem anúncio identificado — somada aos criativos, fecha com o funil de conversão. Com período selecionado, cada etapa conta quem a atingiu no período."
      >
        <p className="mb-4 text-[12px] text-[var(--color-text-faint)]">
          {formatNumber(comAnuncio)} leads vieram de anúncio · {formatNumber(semAnuncio.leads)} sem anúncio
          {pendentes > 0 && <> · lendo a origem de mais {formatNumber(pendentes)} no CRM</>}
        </p>

        {!temLinhas ? (
          <p className="py-6 text-center text-[13px] text-[var(--color-text-faint)]">
            {pendentes > 0
              ? "Lendo no CRM o anúncio de origem dos leads — os criativos aparecem aqui em instantes."
              : "Nenhum lead no período selecionado."}
          </p>
        ) : (
          <div className="overflow-x-auto">
            <div className="grid min-w-[820px] grid-cols-[minmax(0,2.6fr)_1.3fr_repeat(5,0.75fr)] gap-x-4 text-[12px] text-[var(--color-text-faint)]">
              <span className="pb-2">Criativo</span>
              <span className="pb-2">Leads</span>
              <span className="pb-2 text-right">Qualificados</span>
              <span className="pb-2 text-right">Agendados</span>
              <span className="pb-2 text-right">Compareceram</span>
              <span className="pb-2 text-right">Converteram</span>
              <span className="pb-2 text-right">Taxa agend.</span>

              {visiveis.map((r, i) => (
                <LinhaFunil
                  key={r.criativo.chave}
                  origem={<OrigemCriativo resultado={r} />}
                  funil={r}
                  maxLeads={maxLeads}
                  index={i}
                />
              ))}

              {criativos.length > VISIVEIS_INICIAL && (
                <div className="col-span-7 flex justify-center border-t border-[var(--color-border)] py-2">
                  <button
                    type="button"
                    onClick={() => setVerTodos((v) => !v)}
                    className="rounded-full px-4 py-1.5 text-[12.5px] text-[var(--color-text-muted)] transition-colors hover:bg-white/5 hover:text-[var(--color-text)]"
                  >
                    {verTodos ? "Mostrar menos" : `Ver todos os ${criativos.length} criativos`}
                  </button>
                </div>
              )}

              {semAnuncio.leads + semAnuncio.qualificados + semAnuncio.agendados > 0 && (
                <LinhaFunil
                  origem={<OrigemSemAnuncio />}
                  funil={semAnuncio}
                  maxLeads={maxLeads}
                  index={visiveis.length}
                  corBarra="var(--color-text-faint)"
                />
              )}
            </div>
          </div>
        )}
      </ChartPanel>
    </section>
  );
}

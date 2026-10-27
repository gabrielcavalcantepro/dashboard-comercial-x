"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { ClientePublico } from "@/lib/types";
import {
  FILTROS_VAZIOS,
  computeCriativos,
  computeDesistenciaPosQualificacao,
  computeEvolucao,
  computeFunil,
  computeKpis,
  computeMotivosDesistencia,
  computePerformancePorVendedor,
  contarPor,
  definirGranularidade,
  excluirResgate,
  faixaDeDatasDisponivel,
  filtrarLeads,
  leadsPorDiaDaSemana,
  obterOpcoesFiltro,
  periodoAnteriorEquivalente,
  taxaDesistenciaPor,
  ticketMedioPor,
  type Filtros,
  type Periodo,
} from "@/lib/metrics";
import { addDaysISO, formatCurrency, formatDateBR, formatNumber, toISODate } from "@/lib/format";
import { useLiveLeads } from "@/hooks/useLiveLeads";
import { useToast } from "@/components/ui/Toast";
import { DashboardHeader } from "./DashboardHeader";
import { FiltersBar } from "./FiltersBar";
import { KpiSection } from "./KpiSection";
import { Button } from "@/components/ui/Button";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { ChartPanel } from "./charts/ChartPanel";
import { FunnelChart } from "./charts/FunnelChart";
import { LeadsEvolutionChart } from "./charts/LeadsEvolutionChart";
import { ConversionTrendChart } from "./charts/ConversionTrendChart";
import { RankedBars } from "./charts/RankedBars";
import { VerticalBars } from "./charts/VerticalBars";
import { TeamLeaderboard } from "./charts/TeamLeaderboard";
import { PostQualDropoutCallout } from "./charts/PostQualDropoutCallout";
import { ReportModal } from "./report/ReportModal";
import { ReportDocument } from "./report/ReportDocument";
import { gerarRelatorioPdf } from "./report/generateReportPdf";
import { TrafegoPagoSection } from "./ads/TrafegoPagoSection";
import { CriativosResultadoSection } from "./criativos/CriativosResultadoSection";
import { PresentationButton } from "./presentation/PresentationButton";
import { PresentationView } from "./presentation/PresentationView";

interface DashboardClientProps {
  cliente: ClientePublico;
}

export function DashboardClient({ cliente }: DashboardClientProps) {
  const {
    leads,
    anuncios,
    carregandoInicial,
    erroInicial,
    avisoDiscreto,
    atualizadoEm,
    avisosColunas,
    statusNaoReconhecido,
    pausado,
    alternarPausado,
    atualizarAgora,
  } = useLiveLeads(cliente.id);

  const [filtros, setFiltros] = useState<Filtros>(FILTROS_VAZIOS);

  const opcoes = useMemo(() => obterOpcoesFiltro(leads), [leads]);
  const leadsFiltrados = useMemo(() => filtrarLeads(leads, filtros), [leads, filtros]);
  const kpis = useMemo(() => computeKpis(leadsFiltrados), [leadsFiltrados]);

  const kpisAnterior = useMemo(() => {
    if (!filtros.periodo) return null;
    const anterior = periodoAnteriorEquivalente(filtros.periodo);
    const leadsAnteriores = filtrarLeads(leads, { ...filtros, periodo: anterior });
    return computeKpis(leadsAnteriores);
  }, [leads, filtros]);

  const funil = useMemo(() => computeFunil(leadsFiltrados), [leadsFiltrados]);

  // A API do Meta Ads exige um período fechado (não existe "todo o
  // período"), então quando o filtro global está em "Todo o período" a
  // seção de tráfego pago usa os últimos 30 dias como padrão.
  const periodoAds: Periodo = useMemo(() => {
    if (filtros.periodo) return filtros.periodo;
    const hoje = toISODate(new Date());
    return { inicio: addDaysISO(hoje, -29), fim: hoje };
  }, [filtros.periodo]);

  const granularidade = useMemo(() => {
    if (filtros.periodo) return definirGranularidade(filtros.periodo.inicio, filtros.periodo.fim);
    const faixa = faixaDeDatasDisponivel(leadsFiltrados);
    const hoje = toISODate(new Date());
    return definirGranularidade(faixa?.inicio ?? hoje, faixa?.fim ?? hoje);
  }, [filtros.periodo, leadsFiltrados]);

  // "Resgate" é lead que a equipe já tinha, não uma chegada nova — métricas
  // sobre volume/padrão de chegada de leads não devem contar como se fosse
  // lead novo. Métricas de conversão do funil continuam usando todos os
  // leads (leadsFiltrados), já que um lead de Resgate passa pelo funil
  // normalmente e pode qualificar, agendar ou desistir como qualquer outro.
  const leadsChegada = useMemo(() => excluirResgate(leadsFiltrados), [leadsFiltrados]);

  const evolucaoChegada = useMemo(
    () => computeEvolucao(leadsChegada, granularidade),
    [leadsChegada, granularidade],
  );
  const evolucaoConversao = useMemo(
    () => computeEvolucao(leadsFiltrados, granularidade),
    [leadsFiltrados, granularidade],
  );

  // Leads sem fonte/procedimento/vendedor preenchido ficam fora dessas
  // comparações — incluí-los criaria uma pseudo-categoria "vazia" que
  // distorce percentuais (amostra pequena e não representativa).
  const comFonte = useMemo(() => leadsFiltrados.filter((l) => l.fonte), [leadsFiltrados]);
  const comProcedimento = useMemo(
    () => leadsFiltrados.filter((l) => l.procedimento),
    [leadsFiltrados],
  );
  const comVendedor = useMemo(() => leadsFiltrados.filter((l) => l.vendedor), [leadsFiltrados]);

  const porFonte = useMemo(() => contarPor(comFonte, (l) => l.fonte), [comFonte]);
  const porProcedimento = useMemo(
    () => contarPor(comProcedimento, (l) => l.procedimento),
    [comProcedimento],
  );
  const ticketPorProcedimento = useMemo(
    () => ticketMedioPor(comProcedimento, (l) => l.procedimento),
    [comProcedimento],
  );
  const porDiaDaSemana = useMemo(() => leadsPorDiaDaSemana(leadsChegada), [leadsChegada]);
  const performanceVendedor = useMemo(
    () => computePerformancePorVendedor(comVendedor),
    [comVendedor],
  );
  const desistenciaPorFonte = useMemo(
    () => taxaDesistenciaPor(comFonte, (l) => l.fonte),
    [comFonte],
  );
  const desistenciaPorVendedor = useMemo(
    () => taxaDesistenciaPor(comVendedor, (l) => l.vendedor),
    [comVendedor],
  );
  const posQualificacao = useMemo(
    () => computeDesistenciaPosQualificacao(leadsFiltrados),
    [leadsFiltrados],
  );
  const motivos = useMemo(() => computeMotivosDesistencia(leadsFiltrados), [leadsFiltrados]);
  // Só leads do CRM têm anúncio de origem; os da planilha entram numa linha
  // própria, para a seção fechar com o funil do painel.
  const temLeadsDoCrm = useMemo(() => leads.some((l) => l.fonteDados === "pipefacil"), [leads]);
  const criativos = useMemo(
    () =>
      computeCriativos(leadsFiltrados, anuncios),
    [leadsFiltrados, anuncios],
  );

  const [apresentacaoAtiva, setApresentacaoAtiva] = useState(false);

  const entrarApresentacao = async () => {
    setApresentacaoAtiva(true);
    try {
      await document.documentElement.requestFullscreen();
    } catch {
      // Tela cheia real pode ser negada (ex.: sem gesto do usuário em
      // alguns navegadores) — o layout do modo apresentação já ocupa toda
      // a viewport via CSS de qualquer forma, então seguimos sem ela.
    }
  };

  const sairApresentacao = async () => {
    setApresentacaoAtiva(false);
    if (document.fullscreenElement) {
      try {
        await document.exitFullscreen();
      } catch {
        // já não está mais em tela cheia — nada a fazer
      }
    }
  };

  // Sincroniza o estado quando o usuário sai da tela cheia por fora do
  // nosso botão (Esc nativo, F11, gesto do sistema operacional).
  useEffect(() => {
    const aoMudarFullscreen = () => {
      if (!document.fullscreenElement) setApresentacaoAtiva(false);
    };
    document.addEventListener("fullscreenchange", aoMudarFullscreen);
    return () => document.removeEventListener("fullscreenchange", aoMudarFullscreen);
  }, []);

  const { push } = useToast();
  const [relatorioAberto, setRelatorioAberto] = useState(false);
  const [gerandoRelatorio, setGerandoRelatorio] = useState(false);
  const [relatorio, setRelatorio] = useState<{
    vendedorLabel: string;
    periodoLabel: string;
    geradoEmLabel: string;
    nomeArquivo: string;
    periodo: Periodo;
    vendedor: string;
  } | null>(null);
  const reportRef = useRef<HTMLDivElement>(null);

  const dadosRelatorio = useMemo(() => {
    if (!relatorio) return null;
    const leadsRelatorio = filtrarLeads(leads, {
      periodo: relatorio.periodo,
      vendedores: relatorio.vendedor ? [relatorio.vendedor] : [],
      fontes: [],
      procedimentos: [],
      statuses: [],
    });
    const comFonteR = leadsRelatorio.filter((l) => l.fonte);
    const comProcedimentoR = leadsRelatorio.filter((l) => l.procedimento);
    return {
      kpis: computeKpis(leadsRelatorio),
      funil: computeFunil(leadsRelatorio),
      porFonte: contarPor(comFonteR, (l) => l.fonte),
      porProcedimento: contarPor(comProcedimentoR, (l) => l.procedimento),
      desistenciaPorFonte: taxaDesistenciaPor(comFonteR, (l) => l.fonte),
      posQualificacao: computeDesistenciaPosQualificacao(leadsRelatorio),
    };
  }, [leads, relatorio]);

  const confirmarRelatorio = ({
    vendedor,
    periodo,
  }: {
    vendedor: string;
    periodo: Periodo;
  }) => {
    setGerandoRelatorio(true);
    const slug = cliente.nome
      .normalize("NFD")
      .replace(/[̀-ͯ]/g, "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "");

    setRelatorio({
      vendedorLabel: vendedor || "Todos os vendedores",
      periodoLabel: `${formatDateBR(periodo.inicio)} — ${formatDateBR(periodo.fim)}`,
      geradoEmLabel: new Date().toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" }),
      nomeArquivo: `relatorio-${slug}-${periodo.inicio}-a-${periodo.fim}.pdf`,
      periodo,
      vendedor,
    });
  };

  // Dispara a captura só depois que o React já comitou o documento
  // off-screen com os dados do relatório atual (efeito, não a resposta ao
  // clique) — assim reportRef.current sempre reflete o conteúdo certo.
  useEffect(() => {
    if (!relatorio || !dadosRelatorio) return;
    let cancelado = false;
    (async () => {
      try {
        if (!reportRef.current) throw new Error("sem conteúdo para capturar");
        await gerarRelatorioPdf(reportRef.current, relatorio.nomeArquivo);
        if (cancelado) return;
        push("Relatório gerado com sucesso.", "success");
        setRelatorioAberto(false);
      } catch {
        if (!cancelado) push("Não foi possível gerar o relatório. Tente novamente.", "error");
      } finally {
        if (!cancelado) {
          setGerandoRelatorio(false);
          setRelatorio(null);
        }
      }
    })();
    return () => {
      cancelado = true;
    };
  }, [relatorio, dadosRelatorio, push]);

  if (carregandoInicial) {
    return (
      <div className="mx-auto flex w-full max-w-[1180px] flex-1 flex-col px-6 py-10">
        <div className="mb-8 h-10 w-52 animate-pulse rounded-full bg-white/5" />
        <div className="mb-4 grid grid-cols-3 gap-3.5">
          {[0, 1, 2].map((i) => (
            <div key={i} className="h-32 animate-pulse rounded-[var(--radius-lg)] bg-white/5" />
          ))}
        </div>
        <div className="grid grid-cols-6 gap-3">
          {[0, 1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="h-24 animate-pulse rounded-[var(--radius-lg)] bg-white/5" />
          ))}
        </div>
      </div>
    );
  }

  if (erroInicial) {
    return (
      <div className="mx-auto flex w-full max-w-[600px] flex-1 flex-col items-center justify-center px-6 py-20 text-center">
        <p className="text-[17px] font-medium text-[var(--color-text)]">Não foi possível carregar este painel</p>
        <p className="mt-2 text-[14px] text-[var(--color-text-muted)]">{erroInicial}</p>
        <div className="mt-6 flex gap-3">
          <Button variant="secondary" onClick={atualizarAgora}>Tentar novamente</Button>
        </div>
      </div>
    );
  }

  if (apresentacaoAtiva) {
    return (
      <PresentationView
        cliente={cliente}
        kpis={kpis}
        funil={funil}
        evolucao={evolucaoChegada}
        porFonte={porFonte}
        porProcedimento={porProcedimento}
        atualizadoEm={atualizadoEm}
        onSair={sairApresentacao}
      />
    );
  }

  return (
    <div className="mx-auto w-full max-w-[1180px] flex-1 px-6 py-10">
      <DashboardHeader
        cliente={cliente}
        atualizadoEm={atualizadoEm}
        pausado={pausado}
        alternarPausado={alternarPausado}
        avisoDiscreto={avisoDiscreto}
      />

      {(avisosColunas.length > 0 || statusNaoReconhecido > 0) && (
        <div className="mb-6 flex flex-col gap-1 rounded-[var(--radius-sm)] border border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-2.5 text-[12px] text-[var(--color-text-faint)]">
          {avisosColunas.map((a) => (
            <span key={a}>{a}</span>
          ))}
          {statusNaoReconhecido > 0 && (
            <span>
              {formatNumber(statusNaoReconhecido)} lead(s) com valor de Status não reconhecido foram
              ignorados nos cálculos de status.
            </span>
          )}
        </div>
      )}

      <FiltersBar
        filtros={filtros}
        onChange={setFiltros}
        opcoes={opcoes}
        onAbrirRelatorio={() => setRelatorioAberto(true)}
      />

      <KpiSection kpis={kpis} kpisAnterior={kpisAnterior} />

      <section className="mb-12">
        <SectionHeading title="Funil e evolução" />
        <div className="grid grid-cols-1 gap-3.5 lg:grid-cols-12">
          <ChartPanel
            title="Funil de conversão"
            tooltip="Mostra quantos leads avançam de Total para Qualificados, Agendados, Comparecidos e Convertidos, revelando em qual etapa o funil mais perde gente. Com um período selecionado, Total conta os leads que chegaram nele e cada etapa conta quem a atingiu nele, mesmo tendo chegado antes. As duas últimas etapas só aparecem se o funil do PipeFácil tiver essas etapas ou se a planilha tiver as colunas 'Compareceu?' e 'Converteu?'."
            className="lg:col-span-4"
          >
            <FunnelChart etapas={funil} />
          </ChartPanel>
          <ChartPanel
            title="Evolução de leads"
            tooltip="Quantidade de leads novos chegando ao longo do tempo, agrupados por dia, semana ou mês conforme o período selecionado. Não inclui leads de Resgate — são leads que a equipe já tinha, não chegadas novas."
            className="lg:col-span-8"
            delay={0.05}
          >
            <LeadsEvolutionChart dados={evolucaoChegada} />
          </ChartPanel>
          <ChartPanel
            title="Tendência de qualificação e agendamento"
            tooltip="Como as taxas de qualificação e de agendamento variaram ao longo do tempo, para enxergar tendência e não só o número atual. Considera todos os leads, incluindo Resgate."
            className="lg:col-span-12"
            delay={0.1}
          >
            <ConversionTrendChart dados={evolucaoConversao} />
          </ChartPanel>
        </div>
      </section>

      <section className="mb-12">
        <SectionHeading title="Origem e distribuição" />
        <div className="grid grid-cols-1 gap-3.5 lg:grid-cols-2">
          <ChartPanel
            title="Leads por fonte"
            tooltip="De onde vêm os leads: indicação, tráfego pago, prospecção etc."
          >
            <RankedBars
              items={porFonte.map((f) => ({ label: f.chave, value: f.total }))}
              valueFormatter={formatNumber}
            />
          </ChartPanel>
          <ChartPanel
            title="Leads por procedimento"
            tooltip="Quais procedimentos médicos concentram mais interesse dos leads."
            delay={0.05}
          >
            <RankedBars
              items={porProcedimento.map((p) => ({ label: p.chave, value: p.total }))}
              valueFormatter={formatNumber}
              color="var(--color-avaliando)"
            />
          </ChartPanel>
          <ChartPanel
            title="Ticket médio por procedimento"
            tooltip="Valor médio de interesse declarado para cada procedimento."
            delay={0.1}
          >
            <RankedBars
              items={ticketPorProcedimento.map((p) => ({
                label: p.chave,
                value: p.media,
                sublabel: `${p.amostras} leads`,
              }))}
              valueFormatter={(v) => formatCurrency(v)}
              color="var(--color-agendado)"
            />
          </ChartPanel>
          <ChartPanel
            title="Leads por dia da semana"
            tooltip="Em quais dias da semana chegam mais leads novos — útil para identificar padrões de volume. Não inclui leads de Resgate — são leads que a equipe já tinha, não chegadas novas."
            delay={0.15}
          >
            <VerticalBars
              items={porDiaDaSemana.map((d) => ({ label: d.chave, value: d.total }))}
            />
          </ChartPanel>
        </div>
      </section>

      <section className="mb-12">
        <SectionHeading title="Performance do time" />
        <ChartPanel
          title="Performance por vendedor"
          tooltip="Compara, lado a lado, quantos leads cada vendedor atendeu, a taxa de conversão sobre os qualificados e o ticket médio."
        >
          <TeamLeaderboard dados={performanceVendedor} />
        </ChartPanel>
      </section>

      <section>
        <SectionHeading
          title="Desistência"
          description="onde e por que o funil perde leads"
        />
        <div className="grid grid-cols-1 gap-3.5 lg:grid-cols-3">
          <PostQualDropoutCallout dados={posQualificacao} />
          <ChartPanel
            title="Desistência por fonte"
            tooltip="Percentual de desistência dentro de cada fonte — mostra qual canal traz o lead que mais desiste."
            delay={0.05}
          >
            <RankedBars
              items={desistenciaPorFonte.map((f) => ({
                label: f.chave,
                value: f.taxa,
                sublabel: `${f.desistencias}/${f.total}`,
              }))}
              valueFormatter={(v) => `${v.toFixed(0)}%`}
              color="var(--color-desistiu)"
            />
          </ChartPanel>
          <ChartPanel
            title="Desistência por vendedor"
            tooltip="Percentual de desistência dentro dos leads atendidos por cada vendedor."
            delay={0.1}
          >
            <RankedBars
              items={desistenciaPorVendedor.map((v) => ({
                label: v.chave,
                value: v.taxa,
                sublabel: `${v.desistencias}/${v.total}`,
              }))}
              valueFormatter={(v) => `${v.toFixed(0)}%`}
              color="var(--color-desistiu)"
            />
          </ChartPanel>
          <ChartPanel
            title="Motivo de desistência"
            tooltip='Categorização automática a partir do texto livre da coluna Observações (ex.: "não respondeu" vs. "sumiu após valor" vs. outros).'
            className="lg:col-span-3"
            delay={0.15}
          >
            <RankedBars
              items={motivos.map((m) => ({
                label: m.motivo,
                value: m.total,
                sublabel: `${m.percentual.toFixed(0)}%`,
              }))}
              valueFormatter={formatNumber}
              color="var(--color-desistiu)"
            />
          </ChartPanel>
        </div>
      </section>

      {temLeadsDoCrm && <CriativosResultadoSection resumo={criativos} />}

      <TrafegoPagoSection cliente={cliente} periodo={periodoAds} />

      <ReportModal
        open={relatorioAberto}
        onClose={() => {
          if (gerandoRelatorio) return;
          setRelatorioAberto(false);
        }}
        vendedores={opcoes.vendedores}
        onConfirmar={confirmarRelatorio}
        gerando={gerandoRelatorio}
      />

      {relatorio && dadosRelatorio && (
        <div style={{ position: "fixed", top: 0, left: -99999, zIndex: -1 }} aria-hidden>
          <ReportDocument
            ref={reportRef}
            cliente={cliente}
            vendedorLabel={relatorio.vendedorLabel}
            periodoLabel={relatorio.periodoLabel}
            geradoEmLabel={relatorio.geradoEmLabel}
            kpis={dadosRelatorio.kpis}
            funil={dadosRelatorio.funil}
            porFonte={dadosRelatorio.porFonte}
            porProcedimento={dadosRelatorio.porProcedimento}
            desistenciaPorFonte={dadosRelatorio.desistenciaPorFonte}
            posQualificacao={dadosRelatorio.posQualificacao}
          />
        </div>
      )}

      <PresentationButton onClick={entrarApresentacao} />
    </div>
  );
}

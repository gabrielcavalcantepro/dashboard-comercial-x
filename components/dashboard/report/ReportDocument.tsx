import { forwardRef } from "react";
import type {
  ContagemItem,
  DesistenciaPosQualificacao,
  EtapaFunil,
  KpiValues,
  taxaDesistenciaPor,
} from "@/lib/metrics";
import type { Cliente } from "@/lib/types";
import { formatNumber, formatPercent } from "@/lib/format";

export const LARGURA_PAGINA = 794;
export const ALTURA_PAGINA = 1123;

export interface ReportDocumentProps {
  cliente: Cliente;
  vendedorLabel: string;
  periodoLabel: string;
  geradoEmLabel: string;
  kpis: KpiValues;
  funil: EtapaFunil[];
  porFonte: ContagemItem[];
  porProcedimento: ContagemItem[];
  desistenciaPorFonte: ReturnType<typeof taxaDesistenciaPor>;
  posQualificacao: DesistenciaPosQualificacao;
}

function ReportPage({
  numero,
  children,
}: {
  numero: number;
  children: React.ReactNode;
}) {
  return (
    <div
      data-report-page
      style={{
        width: LARGURA_PAGINA,
        height: ALTURA_PAGINA,
        overflow: "hidden",
        background: "#151515",
        color: "#f5f4ec",
        padding: "56px 56px 40px",
        display: "flex",
        flexDirection: "column",
        boxSizing: "border-box",
        position: "relative",
      }}
    >
      {children}
      <div
        style={{
          position: "absolute",
          bottom: 24,
          left: 56,
          right: 56,
          display: "flex",
          justifyContent: "space-between",
          fontSize: 11,
          color: "rgba(245,244,236,0.38)",
        }}
      >
        <span>Painel de Leads · Relatório de performance</span>
        <span>Página {numero}</span>
      </div>
    </div>
  );
}

function ReportHeader({
  cliente,
  vendedorLabel,
  periodoLabel,
  geradoEmLabel,
}: {
  cliente: Cliente;
  vendedorLabel: string;
  periodoLabel: string;
  geradoEmLabel: string;
}) {
  return (
    <div style={{ marginBottom: 36 }}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/logo.png" alt="" style={{ height: 30, width: "auto", opacity: 0.95, marginBottom: 28 }} />
      <div style={{ display: "flex", alignItems: "baseline", gap: 10 }}>
        <h1 style={{ fontSize: 26, fontWeight: 600, margin: 0, letterSpacing: "-0.01em" }}>
          {cliente.nome}
        </h1>
        <span
          style={{
            fontSize: 11,
            color: "rgba(245,244,236,0.62)",
            border: "1px solid rgba(245,244,236,0.16)",
            borderRadius: 999,
            padding: "2px 10px",
          }}
        >
          {cliente.segmento}
        </span>
      </div>
      <p style={{ margin: "6px 0 0", fontSize: 13, color: "rgba(245,244,236,0.62)" }}>
        Relatório de performance · {vendedorLabel} · {periodoLabel}
      </p>
      <p style={{ margin: "3px 0 0", fontSize: 11, color: "rgba(245,244,236,0.38)" }}>
        Gerado em {geradoEmLabel}
      </p>
    </div>
  );
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 9, marginBottom: 16 }}>
      <span style={{ width: 7, height: 7, borderRadius: 999, background: "#fad214" }} />
      <h2 style={{ fontSize: 16, fontWeight: 600, margin: 0 }}>{children}</h2>
    </div>
  );
}

function Card({
  children,
  style,
}: {
  children: React.ReactNode;
  style?: React.CSSProperties;
}) {
  return (
    <div
      style={{
        background: "#1b1b1a",
        border: "1px solid rgba(245,244,236,0.08)",
        borderRadius: 20,
        padding: 20,
        ...style,
      }}
    >
      {children}
    </div>
  );
}

function KpiTile({ label, value, hero }: { label: string; value: string; hero?: boolean }) {
  return (
    <Card style={{ flex: 1, padding: hero ? 22 : 16 }}>
      <div style={{ fontSize: hero ? 13 : 11.5, color: "rgba(245,244,236,0.62)" }}>{label}</div>
      <div
        style={{
          marginTop: 8,
          fontSize: hero ? 30 : 20,
          fontWeight: 600,
          lineHeight: 1,
        }}
      >
        {value}
      </div>
    </Card>
  );
}

function StaticFunnel({ etapas }: { etapas: EtapaFunil[] }) {
  const cores = ["rgba(245,244,236,0.38)", "#6fb3ff", "#fad214", "#7be3a8", "#34d399"];
  return (
    <Card>
      <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        {etapas.map((etapa, i) => (
          <div key={etapa.rotulo}>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                fontSize: 12.5,
                marginBottom: 6,
                color: "rgba(245,244,236,0.62)",
              }}
            >
              <span>{etapa.rotulo}</span>
              <span style={{ color: "#f5f4ec" }}>
                <strong>{formatNumber(etapa.valor)}</strong>{" "}
                <span style={{ color: "rgba(245,244,236,0.38)" }}>
                  {formatPercent(etapa.percentualDoTotal, 0)} do total
                </span>
              </span>
            </div>
            <div style={{ height: 22, background: "rgba(255,255,255,0.04)", borderRadius: 6, overflow: "hidden" }}>
              <div
                style={{
                  height: "100%",
                  width: `${Math.max(etapa.percentualDoTotal, 2)}%`,
                  background: cores[i] ?? "#fad214",
                  borderRadius: 6,
                }}
              />
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
}

function StaticRankedBars({
  items,
  valueFormatter,
  color = "#fad214",
  emptyLabel = "Sem dados no período.",
}: {
  items: { label: string; value: number; sublabel?: string }[];
  valueFormatter: (v: number) => string;
  color?: string;
  emptyLabel?: string;
}) {
  if (items.length === 0) {
    return (
      <Card>
        <p style={{ fontSize: 12.5, color: "rgba(245,244,236,0.38)", textAlign: "center", margin: 0 }}>
          {emptyLabel}
        </p>
      </Card>
    );
  }
  const visiveis = items.slice(0, 6);
  const max = Math.max(...visiveis.map((i) => i.value), 1);
  return (
    <Card>
      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        {visiveis.map((item) => (
          <div key={item.label}>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                fontSize: 12.5,
                marginBottom: 5,
                color: "rgba(245,244,236,0.62)",
              }}
            >
              <span>{item.label}</span>
              <span style={{ color: "#f5f4ec", fontWeight: 500 }}>
                {valueFormatter(item.value)}
                {item.sublabel && (
                  <span style={{ marginLeft: 6, fontWeight: 400, color: "rgba(245,244,236,0.38)" }}>
                    {item.sublabel}
                  </span>
                )}
              </span>
            </div>
            <div style={{ height: 6, background: "rgba(255,255,255,0.05)", borderRadius: 999, overflow: "hidden" }}>
              <div
                style={{
                  height: "100%",
                  width: `${(item.value / max) * 100}%`,
                  background: color,
                  borderRadius: 999,
                }}
              />
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
}

function StaticCallout({ dados }: { dados: DesistenciaPosQualificacao }) {
  return (
    <div
      style={{
        background: "linear-gradient(155deg, rgba(255,111,112,0.1), rgba(255,111,112,0.02))",
        border: "1px solid rgba(255,111,112,0.3)",
        borderRadius: 20,
        padding: 20,
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        gap: 16,
      }}
    >
      <div>
        <p style={{ margin: 0, fontSize: 12.5, color: "#ff6f70", fontWeight: 500 }}>
          O vazamento mais caro do funil
        </p>
        <p style={{ margin: "4px 0 0", fontSize: 14, fontWeight: 500 }}>Desistência pós-qualificação</p>
      </div>
      <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between" }}>
        <span style={{ fontSize: 34, fontWeight: 600, color: "#ff6f70", lineHeight: 1 }}>
          {formatPercent(dados.taxa)}
        </span>
        <span style={{ fontSize: 11.5, color: "rgba(245,244,236,0.62)", textAlign: "right" }}>
          {formatNumber(dados.qualificadosDesistiram)} de {formatNumber(dados.totalQualificados)}
          <br />
          leads qualificados desistiram
        </span>
      </div>
    </div>
  );
}

export const ReportDocument = forwardRef<HTMLDivElement, ReportDocumentProps>(
  function ReportDocument(
    {
      cliente,
      vendedorLabel,
      periodoLabel,
      geradoEmLabel,
      kpis,
      funil,
      porFonte,
      porProcedimento,
      desistenciaPorFonte,
      posQualificacao,
    },
    ref,
  ) {
    return (
      <div ref={ref} style={{ fontFamily: "var(--font-body)" }}>
        <ReportPage numero={1}>
          <ReportHeader
            cliente={cliente}
            vendedorLabel={vendedorLabel}
            periodoLabel={periodoLabel}
            geradoEmLabel={geradoEmLabel}
          />

          <SectionTitle>Visão geral</SectionTitle>
          <div style={{ display: "flex", gap: 12, marginBottom: 14 }}>
            <KpiTile hero label="Total de leads" value={formatNumber(kpis.totalLeads)} />
            <KpiTile hero label="Taxa de agendamento" value={formatPercent(kpis.taxaAgendamento)} />
            <KpiTile hero label="Taxa de qualificação" value={formatPercent(kpis.taxaQualificacao)} />
          </div>
          <div style={{ display: "flex", gap: 12, marginBottom: 32 }}>
            <KpiTile label="Qualificados" value={formatNumber(kpis.qualificados)} />
            <KpiTile label="Agendamentos" value={formatNumber(kpis.agendamentos)} />
            <KpiTile label="Em avaliação" value={formatNumber(kpis.emAvaliacao)} />
            <KpiTile label="Taxa de desistência" value={formatPercent(kpis.taxaDesistencia)} />
          </div>

          <SectionTitle>Funil de conversão</SectionTitle>
          <StaticFunnel etapas={funil} />
        </ReportPage>

        <ReportPage numero={2}>
          <div style={{ height: 8 }} />
          <SectionTitle>Leads por fonte</SectionTitle>
          <div style={{ marginBottom: 28 }}>
            <StaticRankedBars
              items={porFonte.map((f) => ({ label: f.chave, value: f.total }))}
              valueFormatter={formatNumber}
            />
          </div>

          <SectionTitle>Leads por procedimento</SectionTitle>
          <div style={{ marginBottom: 28 }}>
            <StaticRankedBars
              items={porProcedimento.map((p) => ({ label: p.chave, value: p.total }))}
              valueFormatter={formatNumber}
              color="#6fb3ff"
            />
          </div>

          <SectionTitle>Desistência</SectionTitle>
          <div style={{ display: "flex", gap: 12 }}>
            <div style={{ flex: 1 }}>
              <StaticCallout dados={posQualificacao} />
            </div>
            <div style={{ flex: 1 }}>
              <StaticRankedBars
                items={desistenciaPorFonte.map((f) => ({
                  label: f.chave,
                  value: f.taxa,
                  sublabel: `${f.desistencias}/${f.total}`,
                }))}
                valueFormatter={(v) => `${v.toFixed(0)}%`}
                color="#ff6f70"
              />
            </div>
          </div>
        </ReportPage>
      </div>
    );
  },
);

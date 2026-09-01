import type { KpiValues } from "@/lib/metrics";
import { variacaoPontos, variacaoRelativa } from "@/lib/metrics";
import { formatCurrency, formatNumber, formatPercent } from "@/lib/format";
import { KpiCard } from "./KpiCard";

interface KpiSectionProps {
  kpis: KpiValues;
  kpisAnterior: KpiValues | null;
}

export function KpiSection({ kpis, kpisAnterior }: KpiSectionProps) {
  const rel = (atual: number, anteriorKey: keyof KpiValues) =>
    kpisAnterior ? variacaoRelativa(atual, kpisAnterior[anteriorKey] as number) : null;
  const pts = (atual: number | null, anteriorKey: keyof KpiValues) =>
    kpisAnterior ? variacaoPontos(atual, kpisAnterior[anteriorKey] as number | null) : null;

  return (
    <div className="mb-10">
      <div className="mb-3.5 grid grid-cols-1 gap-3.5 sm:grid-cols-3">
        <KpiCard
          hero
          label="Total de leads"
          value={formatNumber(kpis.totalLeads)}
          variacao={rel(kpis.totalLeads, "totalLeads")}
          tooltip="Quantidade total de leads recebidos no período filtrado, considerando a data do primeiro contato."
        />
        <KpiCard
          hero
          label="Taxa de agendamento"
          value={formatPercent(kpis.taxaAgendamento)}
          variacao={pts(kpis.taxaAgendamento, "taxaAgendamento")}
          variacaoUnidade="p.p."
          tooltip="Percentual de leads qualificados que viraram agendamento (Agendados ÷ Qualificados)."
          delay={0.05}
        />
        <KpiCard
          hero
          label="Receita projetada"
          value={formatCurrency(kpis.receitaProjetada)}
          variacao={rel(kpis.receitaProjetada, "receitaProjetada")}
          tooltip="Soma do Ticket Médio de todos os leads com status Agendado no período filtrado."
          delay={0.1}
        />
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        <KpiCard
          label="Qualificados"
          value={formatNumber(kpis.qualificados)}
          variacao={rel(kpis.qualificados, "qualificados")}
          tooltip='Leads marcados como "Sim" na coluna Lead Qualificado.'
          delay={0.12}
        />
        <KpiCard
          label="Agendamentos"
          value={formatNumber(kpis.agendamentos)}
          variacao={rel(kpis.agendamentos, "agendamentos")}
          tooltip="Leads com status Agendado — o resultado positivo do funil."
          delay={0.15}
        />
        <KpiCard
          label="Em avaliação"
          value={formatNumber(kpis.emAvaliacao)}
          variacao={rel(kpis.emAvaliacao, "emAvaliacao")}
          tooltip="Leads com status Avaliando: ainda estão no meio do funil, não contam como agendamento nem como desistência."
          delay={0.18}
        />
        <KpiCard
          label="Taxa de qualificação"
          value={formatPercent(kpis.taxaQualificacao)}
          variacao={pts(kpis.taxaQualificacao, "taxaQualificacao")}
          variacaoUnidade="p.p."
          tooltip="Percentual de leads totais que foram qualificados (Qualificados ÷ Total)."
          delay={0.21}
        />
        <KpiCard
          label="Taxa de desistência"
          value={formatPercent(kpis.taxaDesistencia)}
          variacao={pts(kpis.taxaDesistencia, "taxaDesistencia")}
          variacaoUnidade="p.p."
          positivoQuandoSobe={false}
          tooltip="Percentual de leads totais que desistiram (Desistiu ÷ Total)."
          delay={0.24}
        />
        <KpiCard
          label="Ticket médio"
          value={formatCurrency(kpis.ticketMedio)}
          variacao={rel(kpis.ticketMedio ?? 0, "ticketMedio")}
          tooltip="Valor médio do procedimento de interesse, considerando todos os leads com valor preenchido."
          delay={0.27}
        />
      </div>
    </div>
  );
}

import type { MetaInsightsAgregado } from "@/lib/meta-types";
import { variacaoPontos, variacaoRelativa } from "@/lib/metrics";
import { formatCurrency, formatNumber, formatPercent } from "@/lib/format";
import { KpiCard } from "@/components/dashboard/KpiCard";

interface AdsKpiSectionProps {
  agregado: MetaInsightsAgregado;
  agregadoAnterior: MetaInsightsAgregado | null;
}

export function AdsKpiSection({ agregado, agregadoAnterior }: AdsKpiSectionProps) {
  const rel = (chave: keyof MetaInsightsAgregado) =>
    agregadoAnterior
      ? variacaoRelativa(agregado[chave] as number, agregadoAnterior[chave] as number)
      : null;
  const pts = (chave: keyof MetaInsightsAgregado) =>
    agregadoAnterior
      ? variacaoPontos(agregado[chave] as number, agregadoAnterior[chave] as number)
      : null;

  return (
    <div className="mb-10">
      <div className="mb-3.5 grid grid-cols-1 gap-3.5 sm:grid-cols-3">
        <KpiCard
          hero
          label="Investimento"
          value={formatCurrency(agregado.spend, true)}
          variacao={rel("spend")}
          tooltip="Total investido em anúncios no período selecionado, somando todas as campanhas ativas da conta."
        />
        <KpiCard
          hero
          label="Conversas iniciadas"
          value={formatNumber(agregado.conversas)}
          variacao={rel("conversas")}
          tooltip="Quantas conversas no WhatsApp/Instagram foram iniciadas a partir dos anúncios, como o Meta conta (onsite_conversion.messaging_conversation_started_7d). Costuma ser maior que o total de leads novos do CRM: inclui contatos que já estavam no CRM e voltaram pelo anúncio, conversas pelo Direct do Instagram (que não chegam ao WhatsApp) e é registrada no dia do clique no anúncio, sendo atualizada por até 7 dias."
          delay={0.05}
        />
        <KpiCard
          hero
          label="Custo por conversa"
          value={agregado.custoPorConversa !== null ? formatCurrency(agregado.custoPorConversa, true) : "—"}
          variacao={rel("custoPorConversa")}
          positivoQuandoSobe={false}
          tooltip="Investimento dividido pelo número de conversas iniciadas — quanto menor, mais eficiente a campanha em gerar contato."
          delay={0.1}
        />
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        <KpiCard
          label="Impressões"
          value={formatNumber(agregado.impressions)}
          variacao={rel("impressions")}
          tooltip="Quantas vezes os anúncios foram exibidos no período."
          delay={0.12}
        />
        <KpiCard
          label="Cliques no link"
          value={formatNumber(agregado.clicks)}
          variacao={rel("clicks")}
          tooltip="Cliques no link dos anúncios."
          delay={0.15}
        />
        <KpiCard
          label="CPM"
          value={formatCurrency(agregado.cpm, true)}
          variacao={rel("cpm")}
          positivoQuandoSobe={false}
          tooltip="Custo por mil impressões."
          delay={0.18}
        />
        <KpiCard
          label="CPC"
          value={formatCurrency(agregado.cpc, true)}
          variacao={rel("cpc")}
          positivoQuandoSobe={false}
          tooltip="Custo por clique no link."
          delay={0.21}
        />
        <KpiCard
          label="CTR"
          value={formatPercent(agregado.ctr, 2)}
          variacao={pts("ctr")}
          variacaoUnidade="p.p."
          tooltip="Percentual de quem viu o anúncio e clicou no link (cliques ÷ impressões)."
          delay={0.24}
        />
      </div>
    </div>
  );
}

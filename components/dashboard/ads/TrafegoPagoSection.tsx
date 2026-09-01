"use client";

import type { ClientePublico } from "@/lib/types";
import type { Periodo } from "@/lib/metrics";
import { useAdsData } from "@/hooks/useAdsData";
import { formatDateBR } from "@/lib/format";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { ChartPanel } from "@/components/dashboard/charts/ChartPanel";
import { AdsKpiSection } from "./AdsKpiSection";
import { AdsDailyChart } from "./AdsDailyChart";
import { AdsCampaignBreakdown } from "./AdsCampaignBreakdown";
import { AdsCreativesGallery } from "./AdsCreativesGallery";

interface TrafegoPagoSectionProps {
  cliente: ClientePublico;
  periodo: Periodo;
}

export function TrafegoPagoSection({ cliente, periodo }: TrafegoPagoSectionProps) {
  const configurado = Boolean(cliente.metaAdAccountId && cliente.temTokenConfigurado);
  const { dados, carregando, erro } = useAdsData(cliente.id, periodo, configurado);

  if (!configurado) return null;

  return (
    <section className="mt-12">
      <SectionHeading
        title="Tráfego pago"
        description={`${formatDateBR(periodo.inicio)} — ${formatDateBR(periodo.fim)}`}
      />

      {carregando && (
        <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-3">
          {[0, 1, 2].map((i) => (
            <div key={i} className="h-32 animate-pulse rounded-[var(--radius-lg)] bg-white/5" />
          ))}
        </div>
      )}

      {!carregando && erro && (
        <div className="rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface)] px-6 py-10 text-center">
          <p className="text-[14px] text-[var(--color-text-muted)]">{erro}</p>
        </div>
      )}

      {!carregando && !erro && dados && dados.configurado && (
        <>
          <AdsKpiSection agregado={dados.agregado} agregadoAnterior={dados.agregadoAnterior} />

          <div className="mb-3.5 grid grid-cols-1 gap-3.5 lg:grid-cols-12">
            <ChartPanel
              title="Investimento diário"
              tooltip="Investimento em anúncios por dia. Passe o mouse para ver impressões, cliques e conversas de cada dia."
              className="lg:col-span-12"
            >
              <AdsDailyChart dados={dados.diario} />
            </ChartPanel>
          </div>

          <div className="mb-3.5">
            <ChartPanel
              title="Campanhas"
              tooltip="Investimento e conversas por campanha, agrupados pelo objetivo configurado no Meta Ads."
              delay={0.05}
            >
              <AdsCampaignBreakdown campanhas={dados.porCampanha} />
            </ChartPanel>
          </div>

          <div>
            <ChartPanel
              title="Criativos ativos"
              tooltip="Anúncios ativos no momento, com as métricas do período selecionado. Vídeos abrem em um player; posts impulsionados do Instagram sem vídeo disponível abrem o post original."
              delay={0.1}
            >
              <AdsCreativesGallery criativos={dados.criativos} />
            </ChartPanel>
          </div>
        </>
      )}
    </section>
  );
}

import {
  OBJETIVOS_LABEL,
  type AdsData,
  type MetaAction,
  type MetaCampanhaInsight,
  type MetaCriativo,
  type MetaInsightsAgregado,
  type MetaPontoDiario,
} from "./meta-types";

const BASE_URL = "https://graph.facebook.com/v21.0";

export interface MetaAdsError {
  ok: false;
  mensagem: string;
}

export function normalizarAdAccountId(id: string): string {
  const limpo = id.trim();
  return limpo.startsWith("act_") ? limpo : `act_${limpo}`;
}

interface InsightsRawItem {
  spend?: string;
  impressions?: string;
  clicks?: string;
  cpm?: string;
  cpc?: string;
  ctr?: string;
  actions?: MetaAction[];
  date_start?: string;
  campaign_id?: string;
  campaign_name?: string;
  objective?: string;
}

interface AdsRawItem {
  id: string;
  name: string;
  creative?: {
    id?: string;
    name?: string;
    thumbnail_url?: string;
    image_url?: string;
    video_id?: string;
    source_instagram_media_id?: string;
    instagram_permalink_url?: string;
    object_story_spec?: { video_data?: { video_id?: string } };
  };
  insights?: { data: InsightsRawItem[] };
}

async function chamarGraphApi<T>(url: string): Promise<{ ok: true; data: T } | MetaAdsError> {
  let res: Response;
  try {
    res = await fetch(url, { cache: "no-store" });
  } catch {
    return {
      ok: false,
      mensagem: "Não foi possível conectar à API do Meta agora. Tente novamente em instantes.",
    };
  }

  const json = await res.json().catch(() => null);
  const erro = json?.error;

  if (!res.ok || erro) {
    const code = erro?.code;
    if (code === 190) {
      return {
        ok: false,
        mensagem:
          "O token de acesso do Meta Ads expirou ou é inválido. Gere um novo token e atualize o cliente.",
      };
    }
    if (code === 100 || code === 803 || code === 200) {
      return {
        ok: false,
        mensagem:
          "Conta de anúncio não encontrada ou o token não tem permissão para acessá-la. Confira o ID da conta e as permissões do token.",
      };
    }
    if (code === 17 || code === 4 || code === 32 || code === 613) {
      return {
        ok: false,
        mensagem: "Limite de requisições da API do Meta atingido. Tente novamente em alguns minutos.",
      };
    }
    return {
      ok: false,
      mensagem: erro?.message
        ? `Erro na API do Meta Ads: ${erro.message}`
        : "Erro inesperado ao consultar o Meta Ads.",
    };
  }

  return { ok: true, data: json as T };
}

function extrairConversas(actions?: MetaAction[]): number {
  if (!actions) return 0;
  const item = actions.find(
    (a) => a.action_type === "onsite_conversion.messaging_conversation_started_7d",
  );
  return item ? Math.round(parseFloat(item.value)) : 0;
}

function numero(valor: string | undefined, inteiro = false): number {
  if (!valor) return 0;
  const n = inteiro ? parseInt(valor, 10) : parseFloat(valor);
  return Number.isFinite(n) ? n : 0;
}

function paraAgregado(item: InsightsRawItem | undefined): MetaInsightsAgregado {
  const spend = numero(item?.spend);
  const conversas = extrairConversas(item?.actions);
  return {
    spend,
    impressions: numero(item?.impressions, true),
    clicks: numero(item?.clicks, true),
    cpm: numero(item?.cpm),
    cpc: numero(item?.cpc),
    ctr: numero(item?.ctr),
    conversas,
    custoPorConversa: conversas > 0 ? spend / conversas : null,
  };
}

function timeRangeParam(periodo: { inicio: string; fim: string }): string {
  return encodeURIComponent(JSON.stringify({ since: periodo.inicio, until: periodo.fim }));
}

async function buscarInsightsAgregados(
  token: string,
  conta: string,
  periodo: { inicio: string; fim: string },
): Promise<{ ok: true; data: MetaInsightsAgregado } | MetaAdsError> {
  const url = `${BASE_URL}/${conta}/insights?fields=spend,impressions,clicks,cpm,cpc,ctr,actions&time_range=${timeRangeParam(periodo)}&level=account&access_token=${token}`;
  const resultado = await chamarGraphApi<{ data: InsightsRawItem[] }>(url);
  if (!resultado.ok) return resultado;
  return { ok: true, data: paraAgregado(resultado.data.data[0]) };
}

async function buscarInsightsDiarios(
  token: string,
  conta: string,
  periodo: { inicio: string; fim: string },
): Promise<{ ok: true; data: MetaPontoDiario[] } | MetaAdsError> {
  const url = `${BASE_URL}/${conta}/insights?fields=spend,impressions,clicks,actions&time_range=${timeRangeParam(periodo)}&time_increment=1&level=account&access_token=${token}`;
  const resultado = await chamarGraphApi<{ data: InsightsRawItem[] }>(url);
  if (!resultado.ok) return resultado;
  const pontos = resultado.data.data.map((item) => ({
    data: item.date_start ?? "",
    spend: numero(item.spend),
    impressions: numero(item.impressions, true),
    clicks: numero(item.clicks, true),
    conversas: extrairConversas(item.actions),
  }));
  return { ok: true, data: pontos };
}

async function buscarInsightsPorCampanha(
  token: string,
  conta: string,
  periodo: { inicio: string; fim: string },
): Promise<{ ok: true; data: MetaCampanhaInsight[] } | MetaAdsError> {
  const url = `${BASE_URL}/${conta}/insights?fields=campaign_id,campaign_name,objective,spend,impressions,clicks,cpm,cpc,ctr,actions&time_range=${timeRangeParam(periodo)}&level=campaign&access_token=${token}`;
  const resultado = await chamarGraphApi<{ data: InsightsRawItem[] }>(url);
  if (!resultado.ok) return resultado;
  const campanhas = resultado.data.data
    .map((item) => ({
      campaignId: item.campaign_id ?? "",
      campaignName: item.campaign_name ?? "Sem nome",
      objective: item.objective ?? "",
      objectiveLabel: OBJETIVOS_LABEL[item.objective ?? ""] ?? item.objective ?? "Outro",
      spend: numero(item.spend),
      impressions: numero(item.impressions, true),
      clicks: numero(item.clicks, true),
      cpm: numero(item.cpm),
      cpc: numero(item.cpc),
      ctr: numero(item.ctr),
      conversas: extrairConversas(item.actions),
    }))
    .sort((a, b) => b.spend - a.spend);
  return { ok: true, data: campanhas };
}

async function buscarCriativosAtivos(
  token: string,
  conta: string,
  periodo: { inicio: string; fim: string },
): Promise<{ ok: true; data: MetaCriativo[] } | MetaAdsError> {
  const fields =
    "id,name,creative{id,name,thumbnail_url,image_url,video_id,source_instagram_media_id,instagram_permalink_url," +
    `object_story_spec{video_data{video_id}}},insights.time_range(${JSON.stringify({
      since: periodo.inicio,
      until: periodo.fim,
    })}){spend,impressions,clicks,cpm,cpc,ctr,actions}`;
  const filtering = JSON.stringify([{ field: "effective_status", operator: "IN", value: ["ACTIVE"] }]);
  const url = `${BASE_URL}/${conta}/ads?fields=${encodeURIComponent(fields)}&filtering=${encodeURIComponent(filtering)}&limit=50&access_token=${token}`;

  const resultado = await chamarGraphApi<{ data: AdsRawItem[] }>(url);
  if (!resultado.ok) return resultado;
  const itens = resultado.data.data;

  const videoIdDe = (item: AdsRawItem) =>
    item.creative?.video_id ?? item.creative?.object_story_spec?.video_data?.video_id ?? null;

  const videoIds = new Set<string>();
  for (const item of itens) {
    const vid = videoIdDe(item);
    if (vid) videoIds.add(vid);
  }
  const videoInfo = new Map<string, { source: string | null; picture: string | null }>();
  await Promise.all(
    Array.from(videoIds).map(async (vid) => {
      const r = await chamarGraphApi<{
        source?: string;
        picture?: string;
        format?: { filter?: string; picture?: string }[];
      }>(`${BASE_URL}/${vid}?fields=source,format,picture&access_token=${token}`);
      // A miniatura em alta resolução vem do formato "native" dentro de
      // `format`; o campo `picture` na raiz é um fallback de qualidade menor.
      const nativo = r.ok ? r.data.format?.find((f) => f.filter === "native") : undefined;
      videoInfo.set(vid, {
        source: r.ok ? (r.data.source ?? null) : null,
        picture: r.ok ? (nativo?.picture ?? r.data.picture ?? null) : null,
      });
    }),
  );

  const criativos: MetaCriativo[] = itens
    .map((item) => {
      const insight = item.insights?.data?.[0];
      const videoId = videoIdDe(item);
      const vInfo = videoId ? videoInfo.get(videoId) : undefined;
      return {
        adId: item.id,
        adName: item.name,
        creativeId: item.creative?.id ?? null,
        creativeName: item.creative?.name ?? null,
        imageUrl: item.creative?.image_url ?? null,
        videoId,
        videoUrl: vInfo?.source ?? null,
        videoThumbnail: vInfo?.picture ?? item.creative?.thumbnail_url ?? null,
        isInstagramBoost: Boolean(item.creative?.source_instagram_media_id),
        // Vem direto no objeto creative — não precisa de uma segunda chamada
        // ao node de mídia do Instagram (que exige permissões que o app de
        // Ads normalmente não tem).
        instagramPermalink: item.creative?.instagram_permalink_url ?? null,
        spend: numero(insight?.spend),
        impressions: numero(insight?.impressions, true),
        clicks: numero(insight?.clicks, true),
        cpm: numero(insight?.cpm),
        cpc: numero(insight?.cpc),
        ctr: numero(insight?.ctr),
        conversas: extrairConversas(insight?.actions),
      };
    })
    .sort((a, b) => b.spend - a.spend);

  return { ok: true, data: criativos };
}

function periodoAnterior(periodo: { inicio: string; fim: string }): { inicio: string; fim: string } {
  const inicio = new Date(`${periodo.inicio}T00:00:00Z`);
  const fim = new Date(`${periodo.fim}T00:00:00Z`);
  const diffDias = Math.round((fim.getTime() - inicio.getTime()) / 86400000);
  const fimAnterior = new Date(inicio.getTime() - 86400000);
  const inicioAnterior = new Date(fimAnterior.getTime() - diffDias * 86400000);
  const iso = (d: Date) => d.toISOString().slice(0, 10);
  return { inicio: iso(inicioAnterior), fim: iso(fimAnterior) };
}

export async function buscarDadosAds(
  token: string,
  adAccountId: string,
  periodo: { inicio: string; fim: string },
): Promise<{ ok: true; data: Omit<AdsData, "configurado" | "atualizadoEm" | "avisoAtualizacao"> } | MetaAdsError> {
  const conta = normalizarAdAccountId(adAccountId);
  const anterior = periodoAnterior(periodo);

  const [agregado, agregadoAnterior, diario, porCampanha, criativos] = await Promise.all([
    buscarInsightsAgregados(token, conta, periodo),
    buscarInsightsAgregados(token, conta, anterior),
    buscarInsightsDiarios(token, conta, periodo),
    buscarInsightsPorCampanha(token, conta, periodo),
    buscarCriativosAtivos(token, conta, periodo),
  ]);

  if (!agregado.ok) return agregado;
  if (!diario.ok) return diario;
  if (!porCampanha.ok) return porCampanha;
  if (!criativos.ok) return criativos;

  return {
    ok: true,
    data: {
      periodo,
      agregado: agregado.data,
      agregadoAnterior: agregadoAnterior.ok ? agregadoAnterior.data : null,
      diario: diario.data,
      porCampanha: porCampanha.data,
      criativos: criativos.data,
    },
  };
}

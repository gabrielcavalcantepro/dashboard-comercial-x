import {
  OBJETIVOS_LABEL,
  type AdsData,
  type MetaAction,
  type MetaCampanhaInsight,
  type MetaCriativo,
  type MetaInsightsAgregado,
  type MetaPontoDiario,
} from "./meta-types";

import { chaveDeMiniatura, chaveDeTexto } from "./criativo-chave";

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

// ---------- Criativos da conta (para o "Resultado por criativo") ----------
//
// Índice de todos os anúncios da conta — inclusive pausados e arquivados,
// que ainda têm leads no CRM. Liga cada anúncio de origem dos leads ao
// criativo (vídeo ou imagem) da conta, dá a ele a miniatura atual e diz se
// está no ar.

export interface CriativoNaConta {
  ativo: boolean;
  miniatura: string | null;
  texto: string;
  url: string | null; // post no Instagram
  tipoMidia: "video" | "image";
}

export interface IndiceCriativos {
  criativos: Map<string, CriativoNaConta>;
  porShortcode: Map<string, string>; // post do Instagram -> chave
  porVideoId: Map<string, string>; // post de vídeo no Facebook -> chave
  // Post de imagem no Facebook: o fb.me aponta para um ID um pouco menor
  // que o do post do anúncio (não há como ler os posts da página com a
  // permissão de anúncios). Ordenado pelo ID.
  postsDeImagem: { id: number; chave: string }[];
  imagensPorTexto: Map<string, string[]>; // chaveDeTexto -> chaves de imagem
}

interface AnuncioIndiceRaw {
  effective_status: string;
  creative?: {
    id?: string;
    body?: string;
    thumbnail_url?: string;
    instagram_permalink_url?: string;
    image_hash?: string;
    video_id?: string;
    effective_object_story_id?: string;
    object_story_spec?: {
      video_data?: { video_id?: string; message?: string };
      link_data?: { message?: string; image_hash?: string };
    };
  };
}

const TODOS_OS_STATUS = [
  "ACTIVE",
  "PAUSED",
  "CAMPAIGN_PAUSED",
  "ADSET_PAUSED",
  "ARCHIVED",
  "DELETED",
  "WITH_ISSUES",
  "DISAPPROVED",
  "IN_PROCESS",
  "PENDING_REVIEW",
];

const VALIDADE_INDICE_MS = 10 * 60_000;

declare global {
  var __indiceCriativosMeta: Map<string, { em: number; indice: Promise<IndiceCriativos> }> | undefined;
}

export function buscarIndiceCriativos(adAccountId: string, token: string): Promise<IndiceCriativos> {
  if (!global.__indiceCriativosMeta) global.__indiceCriativosMeta = new Map();
  const cache = global.__indiceCriativosMeta;
  const conta = normalizarAdAccountId(adAccountId);
  const atual = cache.get(conta);
  if (atual && Date.now() - atual.em < VALIDADE_INDICE_MS) return atual.indice;

  const indice = montarIndice(conta, token);
  cache.set(conta, { em: Date.now(), indice });
  return indice;
}

export function shortcodeInstagram(url: string | null | undefined): string | null {
  return url?.match(/instagram\.com\/(?:p|reel)\/([^/?#]+)/)?.[1] ?? null;
}

async function montarIndice(conta: string, token: string): Promise<IndiceCriativos> {
  const fields =
    "effective_status,creative{id,body,thumbnail_url,instagram_permalink_url,image_hash,video_id," +
    "effective_object_story_id,object_story_spec{video_data{video_id,message},link_data{message,image_hash}}}";
  const filtering = JSON.stringify([
    { field: "effective_status", operator: "IN", value: TODOS_OS_STATUS },
  ]);
  // thumbnail_width/height pedem uma miniatura maior que o padrão de 64 px.
  let url: string | undefined =
    `${BASE_URL}/${conta}/ads?fields=${encodeURIComponent(fields)}` +
    `&filtering=${encodeURIComponent(filtering)}&thumbnail_width=400&thumbnail_height=400` +
    `&limit=50&access_token=${token}`;

  const indice: IndiceCriativos = {
    criativos: new Map(),
    porShortcode: new Map(),
    porVideoId: new Map(),
    postsDeImagem: [],
    imagensPorTexto: new Map(),
  };
  for (let pagina = 0; url && pagina < 30; pagina++) {
    const res: { ok: true; data: { data: AnuncioIndiceRaw[]; paging?: { next?: string } } } | MetaAdsError =
      await chamarGraphApi(url);
    if (!res.ok) {
      console.warn("Não foi possível ler os criativos da conta do Meta:", res.mensagem);
      break;
    }
    for (const ad of res.data.data) {
      const c = ad.creative ?? {};
      const videoId = c.video_id ?? c.object_story_spec?.video_data?.video_id;
      const imagem = c.image_hash ?? c.object_story_spec?.link_data?.image_hash;
      const chave = videoId
        ? chaveDeMiniatura(c.thumbnail_url)
        : imagem
          ? `img_${imagem}`
          : c.id
            ? `cr_${c.id}`
            : null;
      if (!chave) continue;

      const ativo = ad.effective_status === "ACTIVE";
      const texto =
        c.body ?? c.object_story_spec?.video_data?.message ?? c.object_story_spec?.link_data?.message ?? "";
      const item = indice.criativos.get(chave) ?? {
        ativo: false,
        miniatura: null,
        texto,
        url: null,
        tipoMidia: videoId ? ("video" as const) : ("image" as const),
      };
      // Prefere os dados de um anúncio que está no ar.
      if (c.thumbnail_url && (!item.miniatura || (ativo && !item.ativo))) item.miniatura = c.thumbnail_url;
      if (c.instagram_permalink_url && (!item.url || ativo)) item.url = c.instagram_permalink_url;
      if (!item.texto) item.texto = texto;
      item.ativo ||= ativo;
      indice.criativos.set(chave, item);

      const shortcode = shortcodeInstagram(c.instagram_permalink_url);
      if (shortcode) indice.porShortcode.set(shortcode, chave);
      if (videoId) indice.porVideoId.set(videoId, chave);
      const postId = c.effective_object_story_id?.split("_")[1];
      if (!videoId && postId) indice.postsDeImagem.push({ id: Number(postId), chave });
      const chaveTexto = chaveDeTexto(texto);
      if (!videoId && chaveTexto) {
        const lista = indice.imagensPorTexto.get(chaveTexto) ?? [];
        if (!lista.includes(chave)) lista.push(chave);
        indice.imagensPorTexto.set(chaveTexto, lista);
      }
    }
    url = res.data.paging?.next;
  }
  indice.postsDeImagem.sort((a, b) => a.id - b.id);
  return indice;
}

// Maior distância observada entre o ID do fb.me e o do post do anúncio de
// imagem correspondente ficou na casa de alguns milhões; acima disso não é
// o mesmo anúncio.
const DISTANCIA_MAXIMA_POST_IMAGEM = 20_000_000;

// Criativo da conta que originou o anúncio, ou null quando não dá para saber
// (ex.: imagens com o mesmo texto e post do Facebook com ID cifrado).
export function criativoDoAnuncio(
  anuncio: { url: string; texto: string; postId?: string | null },
  indice: IndiceCriativos,
): string | null {
  const shortcode = shortcodeInstagram(anuncio.url);
  if (shortcode && indice.porShortcode.has(shortcode)) return indice.porShortcode.get(shortcode)!;
  if (anuncio.postId) {
    const doVideo = indice.porVideoId.get(anuncio.postId);
    if (doVideo) return doVideo;
    const id = Number(anuncio.postId);
    const acima = indice.postsDeImagem.find((p) => p.id >= id);
    if (acima && acima.id - id < DISTANCIA_MAXIMA_POST_IMAGEM) return acima.chave;
  }
  const chaveTexto = chaveDeTexto(anuncio.texto);
  const imagens = chaveTexto ? indice.imagensPorTexto.get(chaveTexto) : undefined;
  return imagens?.length === 1 ? imagens[0] : null;
}

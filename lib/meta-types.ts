export interface MetaAction {
  action_type: string;
  value: string;
}

export interface MetaInsightsAgregado {
  spend: number;
  impressions: number;
  clicks: number;
  cpm: number;
  cpc: number;
  ctr: number;
  conversas: number;
  custoPorConversa: number | null;
}

export interface MetaPontoDiario {
  data: string; // ISO yyyy-mm-dd
  spend: number;
  impressions: number;
  clicks: number;
  conversas: number;
}

export const OBJETIVOS_LABEL: Record<string, string> = {
  MESSAGES: "Mensagens",
  OUTCOME_TRAFFIC: "Tráfego",
  OUTCOME_ENGAGEMENT: "Engajamento",
  OUTCOME_LEADS: "Leads",
  OUTCOME_SALES: "Vendas",
  OUTCOME_AWARENESS: "Reconhecimento",
  // Objetivos do formato legado (pré-ODAX) — ainda aparecem em campanhas
  // criadas antes de 2022 que continuam ativas.
  LINK_CLICKS: "Tráfego",
  CONVERSIONS: "Conversões",
  POST_ENGAGEMENT: "Engajamento",
  PAGE_LIKES: "Curtidas na página",
  VIDEO_VIEWS: "Visualizações de vídeo",
  APP_INSTALLS: "Instalações do app",
  LEAD_GENERATION: "Leads",
  PRODUCT_CATALOG_SALES: "Vendas",
  REACH: "Reconhecimento",
  BRAND_AWARENESS: "Reconhecimento",
  EVENT_RESPONSES: "Respostas a eventos",
  LOCAL_AWARENESS: "Reconhecimento local",
  STORE_VISITS: "Visitas à loja",
};

export interface MetaCampanhaInsight {
  campaignId: string;
  campaignName: string;
  objective: string;
  objectiveLabel: string;
  spend: number;
  impressions: number;
  clicks: number;
  cpm: number;
  cpc: number;
  ctr: number;
  conversas: number;
}

export interface MetaCriativo {
  adId: string;
  adName: string;
  creativeId: string | null;
  creativeName: string | null;
  imageUrl: string | null;
  videoId: string | null;
  videoUrl: string | null;
  videoThumbnail: string | null;
  isInstagramBoost: boolean;
  instagramPermalink: string | null;
  spend: number;
  impressions: number;
  clicks: number;
  cpm: number;
  cpc: number;
  ctr: number;
  conversas: number;
}

export interface AdsData {
  configurado: true;
  periodo: { inicio: string; fim: string };
  agregado: MetaInsightsAgregado;
  agregadoAnterior: MetaInsightsAgregado | null;
  diario: MetaPontoDiario[];
  porCampanha: MetaCampanhaInsight[];
  criativos: MetaCriativo[];
  atualizadoEm: number;
  avisoAtualizacao?: string;
}

export interface AdsNaoConfigurado {
  configurado: false;
}

export type AdsResponse = AdsData | AdsNaoConfigurado;

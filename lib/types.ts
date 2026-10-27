export type StatusLead = "Agendado" | "Avaliando" | "Desistiu";
export type RespostaSimNao = "Sim" | "Não" | "Indefinido";

export interface Lead {
  linha: number;
  fonteDados: "planilha" | "pipefacil";
  dataContato: string | null; // ISO yyyy-mm-dd
  dataContatoRaw: string;
  vendedor: string;
  nomeOuTelefone: string;
  fonte: string;
  qualificado: boolean;
  procedimento: string;
  ticketMedio: number | null;
  status: StatusLead | null;
  statusRaw: string;
  compareceu: RespostaSimNao | null; // null = coluna ausente ou célula vazia
  converteu: RespostaSimNao | null;
  dataAgendamento: string | null;
  observacoes: string;
  // Motivo da perda já categorizado na origem (PipeFácil). Ausente nos leads
  // da planilha, onde o motivo é deduzido do texto livre de observações.
  motivoPerda?: string;
  // Data (ISO) em que o lead atingiu cada etapa, vinda do histórico do
  // PipeFácil. Ausente nos leads da planilha, que só têm a data de contato
  // (ver marcosDoLead em metrics.ts).
  marcos?: DatasMarcos;
  // Só existe em lead projetado num período (ver projetarNoPeriodo): false
  // quando ele entrou no recorte por um evento (ex.: agendou no período)
  // mas chegou antes — não conta como lead novo do período.
  chegou?: boolean;
  // Criativo que trouxe o lead (chave de Criativo, ver chaveDoCriativo).
  // undefined = origem ainda não lida; null = lida, sem anúncio.
  anuncio?: string | null;
  // Para lead do CRM sem anúncio de origem: o que a primeira mensagem
  // indica (ver classificarSemAnuncio). "mensagem" só vem quando é uma frase
  // pronta repetida por vários leads — nunca uma mensagem pessoal.
  semAnuncio?: {
    tipo: "anuncio_sem_clique" | "mensagem_indisponivel" | "mensagem_pronta" | "sem_rastro";
    mensagem?: string;
  };
}

export interface DatasMarcos {
  qualificado: string | null;
  agendado: string | null;
  compareceu: string | null;
  converteu: string | null;
  desistiu: string | null;
}

// Anúncio de clique para WhatsApp que originou a conversa, como o Meta o
// descreve na primeira mensagem do lead.
export interface AnuncioOrigem {
  url: string;
  titulo: string;
  texto: string;
  miniatura: string | null;
  tipoMidia: string | null;
  // ID do post do Facebook por trás do link fb.me (null se cifrado).
  postId?: string | null;
}

export type CampoEssencial =
  | "dataContato"
  | "status"
  | "ticketMedio"
  | "qualificado";

export type CampoOpcional =
  | "vendedor"
  | "nomeOuTelefone"
  | "fonte"
  | "procedimento"
  | "compareceu"
  | "converteu"
  | "dataAgendamento"
  | "observacoes";

export type CampoCanonico = CampoEssencial | CampoOpcional;

export interface ValidacaoAba {
  ok: boolean;
  camposFaltando: CampoEssencial[];
  camposOpcionaisFaltando: CampoOpcional[];
  colunasEncontradas: Partial<Record<CampoCanonico, string>>;
  mensagem?: string;
}

export interface Cliente {
  id: string;
  nome: string;
  segmento: string;
  // Cada cliente tem pelo menos uma fonte de leads: a planilha, o funil do
  // PipeFácil, ou as duas (somadas: a planilha é o histórico anterior ao CRM).
  sheetId: string | null;
  abaNome: string;
  pipefacilPipelineSeq: number | null;
  criadoEm: string;
  metaAdAccountId: string | null;
  metaAccessToken: string | null;
}

// Versão do Cliente segura para trafegar até o navegador: o token do Meta
// Ads nunca sai do servidor (nem em props de Server Component, nem em
// resposta de API) — só a informação de que ele está configurado ou não.
export type ClientePublico = Omit<Cliente, "metaAccessToken"> & {
  temTokenConfigurado: boolean;
};

export interface NovoClienteInput {
  nome: string;
  segmento: string;
  linkPlanilha: string;
  abaNome: string;
  pipefacilPipelineSeq?: number | null;
  metaAdAccountId?: string;
  metaAccessToken?: string;
}

// Criativo exibido no painel: todos os posts (Instagram, Facebook, um por
// anúncio) que usam o mesmo vídeo ou imagem.
export interface Criativo {
  chave: string;
  url: string; // post que mais trouxe leads
  posts: number;
  titulo: string;
  texto: string;
  miniatura: string | null;
  tipoMidia: string | null;
  // Da conta de anúncios do Meta, quando configurada; null = não se sabe.
  ativo: boolean | null;
  // Anúncio de imagem que não deu para identificar: quantas imagens da
  // conta têm o mesmo texto (o lead veio de uma delas).
  variacoes: number | null;
}

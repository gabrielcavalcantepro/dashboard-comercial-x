export type StatusLead = "Agendado" | "Avaliando" | "Desistiu";
export type RespostaSimNao = "Sim" | "Não" | "Indefinido";

export interface Lead {
  linha: number;
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

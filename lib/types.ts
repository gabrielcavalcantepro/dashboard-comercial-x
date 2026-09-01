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
  sheetId: string;
  abaNome: string;
  criadoEm: string;
}

export interface NovoClienteInput {
  nome: string;
  segmento: string;
  linkPlanilha: string;
  abaNome: string;
}

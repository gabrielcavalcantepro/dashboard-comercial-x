import type {
  CampoCanonico,
  CampoEssencial,
  CampoOpcional,
  Lead,
  RespostaSimNao,
  StatusLead,
  ValidacaoAba,
} from "./types";

const ESSENCIAIS: CampoEssencial[] = [
  "dataContato",
  "status",
  "ticketMedio",
  "qualificado",
];

const OPCIONAIS: CampoOpcional[] = [
  "vendedor",
  "nomeOuTelefone",
  "fonte",
  "procedimento",
  "compareceu",
  "converteu",
  "dataAgendamento",
  "observacoes",
];

const ROTULOS: Record<CampoCanonico, string> = {
  dataContato: "Data de contato",
  vendedor: "Vendedor",
  nomeOuTelefone: "Nome do Lead / número",
  fonte: "Fonte",
  qualificado: "Lead Qualificado?",
  procedimento: "Procedimento",
  ticketMedio: "Ticket Médio (R$)",
  status: "Status",
  compareceu: "Compareceu?",
  converteu: "Converteu?",
  dataAgendamento: "Data Agendamento",
  observacoes: "Observações",
};

// Ordem de prioridade: aliases mais específicos primeiro para evitar colisão
// (ex.: "data agendamento" não deve casar com o alias de "data de contato").
const ALIASES: Record<CampoCanonico, string[]> = {
  dataContato: ["data de contato", "data do contato", "data contato", "data"],
  vendedor: ["vendedor", "consultor", "atendente", "sdr", "closer"],
  nomeOuTelefone: [
    "nome do lead / numero",
    "nome do lead/numero",
    "nome do lead",
    "nome/numero",
    "nome",
    "lead",
    "telefone",
    "numero",
  ],
  fonte: ["fonte", "origem", "canal"],
  qualificado: [
    "lead qualificado?",
    "lead qualificado",
    "qualificado?",
    "qualificado",
  ],
  procedimento: [
    "procedimento de interesse",
    "procedimento",
    "interesse",
    "servico",
  ],
  ticketMedio: [
    "ticket medio (r$)",
    "ticket medio",
    "ticket",
    "valor estimado",
    "valor",
  ],
  status: ["status"],
  compareceu: ["compareceu", "presenca", "presenca no agendamento"],
  converteu: ["converteu", "conversao", "fechou venda"],
  dataAgendamento: [
    "data do agendamento",
    "data de agendamento",
    "data agendamento",
  ],
  observacoes: ["observacoes", "observacao", "obs", "notas"],
};

const CAMPOS_EM_ORDEM: CampoCanonico[] = [
  "dataContato",
  "dataAgendamento",
  "vendedor",
  "nomeOuTelefone",
  "fonte",
  "qualificado",
  "procedimento",
  "ticketMedio",
  "status",
  "compareceu",
  "converteu",
  "observacoes",
];

function normalizarCabecalho(texto: string): string {
  return texto
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[?:._-]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

export function mapearColunas(cabecalho: string[]): {
  indices: Partial<Record<CampoCanonico, number>>;
  nomes: Partial<Record<CampoCanonico, string>>;
} {
  const normalizados = cabecalho.map(normalizarCabecalho);
  const usados = new Set<number>();
  const indices: Partial<Record<CampoCanonico, number>> = {};
  const nomes: Partial<Record<CampoCanonico, string>> = {};

  // 1ª passada: correspondência exata
  for (const campo of CAMPOS_EM_ORDEM) {
    for (let i = 0; i < normalizados.length; i++) {
      if (usados.has(i)) continue;
      if (ALIASES[campo].includes(normalizados[i])) {
        indices[campo] = i;
        nomes[campo] = cabecalho[i];
        usados.add(i);
        break;
      }
    }
  }

  // 2ª passada: correspondência parcial (contém o alias)
  for (const campo of CAMPOS_EM_ORDEM) {
    if (indices[campo] !== undefined) continue;
    for (let i = 0; i < normalizados.length; i++) {
      if (usados.has(i)) continue;
      if (ALIASES[campo].some((alias) => normalizados[i].includes(alias))) {
        indices[campo] = i;
        nomes[campo] = cabecalho[i];
        usados.add(i);
        break;
      }
    }
  }

  return { indices, nomes };
}

export function validarCabecalho(cabecalho: string[]): ValidacaoAba {
  if (!cabecalho || cabecalho.every((c) => !c || !c.trim())) {
    return {
      ok: false,
      camposFaltando: ESSENCIAIS,
      camposOpcionaisFaltando: OPCIONAIS,
      colunasEncontradas: {},
      mensagem:
        "Não encontramos um cabeçalho na primeira linha dessa aba. Confirme se a aba tem colunas com título na linha 1.",
    };
  }

  const { indices, nomes } = mapearColunas(cabecalho);
  const camposFaltando = ESSENCIAIS.filter((c) => indices[c] === undefined);
  const camposOpcionaisFaltando = OPCIONAIS.filter(
    (c) => indices[c] === undefined,
  );

  if (camposFaltando.length > 0) {
    const listaFaltando = camposFaltando.map((c) => `"${ROTULOS[c]}"`).join(", ");
    return {
      ok: false,
      camposFaltando,
      camposOpcionaisFaltando,
      colunasEncontradas: nomes,
      mensagem: `Não encontramos a coluna ${listaFaltando} nessa aba. Confira se o cabeçalho da planilha tem essas colunas (o nome pode variar um pouco, mas o sentido precisa bater).`,
    };
  }

  return {
    ok: true,
    camposFaltando: [],
    camposOpcionaisFaltando,
    colunasEncontradas: nomes,
  };
}

function normalizarTexto(texto: string): string {
  return texto
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .trim();
}

function parseBooleanoSimNao(valor: string): boolean {
  return normalizarTexto(valor) === "sim";
}

const RESPOSTAS_VALIDAS: Record<string, RespostaSimNao> = {
  sim: "Sim",
  nao: "Não",
  indefinido: "Indefinido",
};

function parseRespostaSimNao(valor: string): RespostaSimNao | null {
  return RESPOSTAS_VALIDAS[normalizarTexto(valor)] ?? null;
}

// Uniformiza capitalização (ex.: "samyra" e "Samyra" digitados de forma
// diferente pela equipe) para não fragmentar os agrupamentos por vendedor,
// fonte e procedimento.
function normalizarRotulo(valor: string): string {
  const limpo = valor.trim().replace(/\s+/g, " ");
  if (!limpo) return "";
  return limpo
    .toLowerCase()
    .split(" ")
    .map((p) => (p ? p.charAt(0).toUpperCase() + p.slice(1) : p))
    .join(" ");
}

// "Fechado" é o valor padrão do dropdown da planilha (o estado inicial de
// toda linha nova, antes do vendedor atualizar o status de verdade) — não é
// um lead de verdade, então a linha inteira é descartada no parsing (ver
// STATUS_EXCLUIDO em parseLinhas), nem entra no total de leads.
// "Negociando" é outro rótulo usado para lead ainda em aberto, equivalente
// a "Avaliando".
const STATUS_VALIDOS: Record<string, StatusLead> = {
  agendado: "Agendado",
  avaliando: "Avaliando",
  negociando: "Avaliando",
  desistiu: "Desistiu",
};

const STATUS_EXCLUIDO = "fechado";

function parseStatus(valor: string): StatusLead | null {
  const norm = normalizarTexto(valor);
  return STATUS_VALIDOS[norm] ?? null;
}

function parseTicket(valor: string): number | null {
  if (!valor || !valor.trim()) return null;
  let limpo = valor.replace(/r\$/gi, "").trim();
  if (!limpo) return null;
  // formato BR: "1.500,00" -> remove separador de milhar, troca decimal
  if (/,\d{1,2}$/.test(limpo)) {
    limpo = limpo.replace(/\./g, "").replace(",", ".");
  } else {
    limpo = limpo.replace(/,/g, "");
  }
  limpo = limpo.replace(/[^\d.-]/g, "");
  const numero = parseFloat(limpo);
  return Number.isFinite(numero) ? numero : null;
}

function parseDataBR(valor: string): string | null {
  if (!valor || !valor.trim()) return null;
  const parte = valor.trim().split(" ")[0];
  const m = parte.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})$/);
  if (!m) return null;
  const [, dia, mes] = m;
  let ano = m[3];
  if (ano.length === 2) ano = `20${ano}`;
  const d = Number(dia);
  const mo = Number(mes);
  const y = Number(ano);
  if (mo < 1 || mo > 12 || d < 1 || d > 31) return null;
  return `${y}-${String(mo).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
}

export function parseLinhas(
  cabecalho: string[],
  linhas: string[][],
): { leads: Lead[]; statusNaoReconhecido: number } {
  const { indices } = mapearColunas(cabecalho);
  const leads: Lead[] = [];
  let statusNaoReconhecido = 0;

  const get = (linha: string[], campo: CampoCanonico): string => {
    const i = indices[campo];
    if (i === undefined) return "";
    return (linha[i] ?? "").toString().trim();
  };

  linhas.forEach((linha, idx) => {
    if (!linha || linha.every((c) => !c || !c.toString().trim())) return;

    const dataContatoRaw = get(linha, "dataContato");
    const statusRaw = get(linha, "status");
    if (normalizarTexto(statusRaw) === STATUS_EXCLUIDO) return;

    const status = parseStatus(statusRaw);
    if (statusRaw && !status) statusNaoReconhecido++;

    leads.push({
      linha: idx + 2,
      dataContato: parseDataBR(dataContatoRaw),
      dataContatoRaw,
      // Campo vazio fica como string vazia (em vez de um rótulo tipo "Não
      // informado") de propósito: assim ele não vira uma pseudo-categoria
      // nos gráficos de comparação por vendedor/fonte/procedimento, o que
      // distorceria taxas (poucos dados = percentuais absurdos).
      vendedor: normalizarRotulo(get(linha, "vendedor")),
      nomeOuTelefone: get(linha, "nomeOuTelefone"),
      fonte: normalizarRotulo(get(linha, "fonte")),
      qualificado: parseBooleanoSimNao(get(linha, "qualificado")),
      procedimento: normalizarRotulo(get(linha, "procedimento")),
      ticketMedio: parseTicket(get(linha, "ticketMedio")),
      status,
      statusRaw,
      compareceu: parseRespostaSimNao(get(linha, "compareceu")),
      converteu: parseRespostaSimNao(get(linha, "converteu")),
      dataAgendamento: parseDataBR(get(linha, "dataAgendamento")),
      observacoes: get(linha, "observacoes"),
    });
  });

  return { leads, statusNaoReconhecido };
}

export interface SheetsFetchResult {
  ok: true;
  cabecalho: string[];
  linhas: string[][];
}

export interface SheetsFetchError {
  ok: false;
  motivo: "sem_chave" | "planilha_inacessivel" | "aba_nao_encontrada" | "erro_desconhecido";
  mensagem: string;
}

export function extrairSheetId(link: string): string | null {
  const direto = link.trim();
  const m = direto.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
  if (m) return m[1];
  if (/^[a-zA-Z0-9-_]{20,}$/.test(direto)) return direto;
  return null;
}

export async function buscarValoresPlanilha(
  sheetId: string,
  aba: string,
): Promise<SheetsFetchResult | SheetsFetchError> {
  const apiKey = process.env.GOOGLE_SHEETS_API_KEY;
  if (!apiKey) {
    return {
      ok: false,
      motivo: "sem_chave",
      mensagem:
        "O servidor ainda não está configurado com uma chave de API do Google Sheets (GOOGLE_SHEETS_API_KEY).",
    };
  }

  const url = `https://sheets.googleapis.com/v4/spreadsheets/${encodeURIComponent(
    sheetId,
  )}/values/${encodeURIComponent(aba)}?key=${apiKey}`;

  let res: Response;
  try {
    res = await fetch(url, { cache: "no-store" });
  } catch {
    return {
      ok: false,
      motivo: "erro_desconhecido",
      mensagem: "Não foi possível conectar ao Google Sheets agora. Tente novamente em instantes.",
    };
  }

  if (res.status === 404) {
    return {
      ok: false,
      motivo: "aba_nao_encontrada",
      mensagem: `Não encontramos uma aba chamada "${aba}" nessa planilha. Confira o nome exatamente como aparece na aba do Google Sheets.`,
    };
  }

  if (res.status === 403 || res.status === 400) {
    return {
      ok: false,
      motivo: "planilha_inacessivel",
      mensagem:
        'Não conseguimos acessar essa planilha. Verifique se o link está correto e se o compartilhamento está como "Qualquer pessoa com o link → Leitor".',
    };
  }

  if (!res.ok) {
    return {
      ok: false,
      motivo: "erro_desconhecido",
      mensagem: "Ocorreu um erro inesperado ao consultar a planilha. Tente novamente.",
    };
  }

  const data = (await res.json()) as { values?: string[][] };
  const values = data.values ?? [];
  if (values.length === 0) {
    return {
      ok: false,
      motivo: "aba_nao_encontrada",
      mensagem: "Essa aba está vazia. Adicione o cabeçalho e os leads antes de cadastrar o cliente.",
    };
  }

  const [cabecalho, ...linhas] = values;
  return { ok: true, cabecalho, linhas };
}

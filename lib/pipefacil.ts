// Cliente da API pública do PipeFácil (CRM da Match Sales).
// Contrato: https://developers.matchsales.com.br/api/openapi.json
//
// O workspace vem sempre da chave (`pf_live_…`) — nunca é enviado na
// requisição. Na API um lead se chama "deal"; é o mesmo negócio.

import { normalizarRotulo } from "./sheets";
import type { Lead, RespostaSimNao } from "./types";

const BASE_URL = "https://pipefacil-server.matchsales.com.br";
const LIMITE_PAGINA = 200; // máximo aceito por GET /api/v1/deals
const MAX_TENTATIVAS_429 = 3;

export interface PipeFacilEtapa {
  id: string;
  seq: number;
  order: number;
  name: string;
  isWon: boolean;
  isLost: boolean;
  dealCount: number;
}

export interface PipeFacilFunil {
  id: string;
  seq: number;
  name: string;
  isDefault: boolean;
  isArchived: boolean;
  stages: PipeFacilEtapa[];
}

export interface PipeFacilNegocio {
  id: string;
  seq: number;
  name: string;
  value: number;
  source: string;
  status: string; // open | won | lost
  pipelineId: string;
  stageId: string;
  lostReason: string | null;
  notes: string | null;
  responsible: { userId: string; name: string | null } | null;
  // Valores dos campos personalizados, indexados pelo slug do campo.
  properties: Record<string, unknown>;
  contact: Record<string, unknown> | null;
  lostFromStage: { id: string; name: string; pipelineId: string } | null;
  stageChangedAt: string;
  closedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface PipeFacilErro {
  ok: false;
  motivo: "sem_chave" | "chave_invalida" | "sem_permissao" | "nao_encontrado" | "limite_excedido" | "erro_desconhecido";
  mensagem: string;
}

type Resultado<T> = { ok: true; dados: T } | PipeFacilErro;

const esperar = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function requisitar<T>(apiKey: string, caminho: string): Promise<Resultado<T>> {
  if (!apiKey) {
    return {
      ok: false,
      motivo: "sem_chave",
      mensagem:
        "O servidor ainda não está configurado com uma chave de API do PipeFácil (PIPEFACIL_API_KEY).",
    };
  }

  for (let tentativa = 1; ; tentativa++) {
    let res: Response;
    try {
      res = await fetch(`${BASE_URL}${caminho}`, {
        headers: { Authorization: `Bearer ${apiKey}` },
        cache: "no-store",
      });
    } catch {
      return {
        ok: false,
        motivo: "erro_desconhecido",
        mensagem: "Não foi possível conectar ao PipeFácil agora. Tente novamente em instantes.",
      };
    }

    if (res.status === 429) {
      if (tentativa >= MAX_TENTATIVAS_429) {
        return {
          ok: false,
          motivo: "limite_excedido",
          mensagem: "O PipeFácil limitou as requisições (600 por minuto). Tente novamente em instantes.",
        };
      }
      const segundos = Number(res.headers.get("X-Rate-Limit-Retry-After-Seconds")) || 1;
      await esperar(Math.min(segundos, 10) * 1000);
      continue;
    }

    if (res.status === 401) {
      return {
        ok: false,
        motivo: "chave_invalida",
        mensagem:
          "A chave de API do PipeFácil é inválida ou foi desativada. Gere outra em Configurações → Chaves de API.",
      };
    }
    if (res.status === 403) {
      return {
        ok: false,
        motivo: "sem_permissao",
        mensagem: "A chave de API do PipeFácil não tem permissão para consultar esses dados.",
      };
    }
    if (res.status === 404) {
      return {
        ok: false,
        motivo: "nao_encontrado",
        mensagem: "Não encontramos esse funil no PipeFácil (ele pode estar fora da visibilidade da chave).",
      };
    }
    if (!res.ok) {
      return {
        ok: false,
        motivo: "erro_desconhecido",
        mensagem: "Ocorreu um erro inesperado ao consultar o PipeFácil. Tente novamente.",
      };
    }

    const corpo = (await res.json()) as { data: T };
    return { ok: true, dados: corpo.data };
  }
}

export function listarFunis(apiKey: string): Promise<Resultado<PipeFacilFunil[]>> {
  return requisitar<PipeFacilFunil[]>(apiKey, "/api/v1/pipelines");
}

export function buscarFunil(apiKey: string, seq: number): Promise<Resultado<PipeFacilFunil>> {
  return requisitar<PipeFacilFunil>(apiKey, `/api/v1/pipelines/${seq}`);
}

// Percorre todas as páginas do funil (abertos, ganhos e perdidos). O cursor
// é opaco e só vale com os mesmos filtros da página anterior.
export async function listarNegociosDoFunil(
  apiKey: string,
  pipelineSeq: number,
): Promise<Resultado<PipeFacilNegocio[]>> {
  const negocios: PipeFacilNegocio[] = [];
  let cursor: string | null = null;

  do {
    const query = new URLSearchParams({
      pipeline: String(pipelineSeq),
      limit: String(LIMITE_PAGINA),
    });
    if (cursor) query.set("cursor", cursor);

    const pagina = await requisitar<{
      items: PipeFacilNegocio[];
      nextCursor: string | null;
      hasMore: boolean;
    }>(apiKey, `/api/v1/deals?${query}`);
    if (!pagina.ok) return pagina;

    negocios.push(...pagina.dados.items);
    cursor = pagina.dados.hasMore ? pagina.dados.nextCursor : null;
  } while (cursor);

  return { ok: true, dados: negocios };
}

export interface PipeFacilCampo {
  slug: string;
  name: string;
  fieldType: string;
  options: { value: string; label: string }[] | null;
}

export function listarCamposDeNegocio(apiKey: string): Promise<Resultado<PipeFacilCampo[]>> {
  return requisitar<PipeFacilCampo[]>(apiKey, "/api/v1/custom-fields?entity=deal");
}

// ---------- Conversão negócio -> Lead do dashboard ----------

function normalizarNome(texto: string): string {
  return texto
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .trim();
}

// Marcos do funil, reconhecidos pelo nome da etapa. A posição de cada marco
// vem do próprio funil, porque a ordem varia entre clientes (há funil com
// "Negociando" antes de "Agendados" e funil com "Negociando" depois de
// "Comparecidos").
const NOMES_MARCO = {
  qualificado: ["qualificados", "qualificado"],
  agendado: ["agendados", "agendado"],
  compareceu: ["compareceu", "comparecidos", "comparecido"],
  converteu: ["convertidos", "convertido"],
};

function ordemDoMarco(funil: PipeFacilFunil, nomes: string[]): number | null {
  const etapa = funil.stages.find((s) => nomes.includes(normalizarNome(s.name)));
  return etapa ? etapa.order : null;
}

const FUSO = "America/Sao_Paulo";
const formatoISO = new Intl.DateTimeFormat("en-CA", { timeZone: FUSO });
const formatoBR = new Intl.DateTimeFormat("pt-BR", { timeZone: FUSO });

export function converterNegocios(
  funil: PipeFacilFunil,
  negocios: PipeFacilNegocio[],
  campos: PipeFacilCampo[],
): Lead[] {
  const etapas = new Map(funil.stages.map((s) => [s.id, s]));
  const camposPorSlug = new Map(campos.map((c) => [c.slug, c]));

  const marcoQualificado =
    ordemDoMarco(funil, NOMES_MARCO.qualificado) ??
    // Funil sem etapa "Qualificados": qualquer avanço além da etapa de
    // entrada conta como qualificado.
    funil.stages.filter((s) => !s.isWon && !s.isLost)[1]?.order ??
    null;
  const marcoAgendado = ordemDoMarco(funil, NOMES_MARCO.agendado);
  const marcoCompareceu = ordemDoMarco(funil, NOMES_MARCO.compareceu);
  const marcoConverteu = ordemDoMarco(funil, NOMES_MARCO.converteu);

  // Campo de seleção guarda o valor interno ("trafego_pago"); o dashboard
  // mostra o rótulo ("Tráfego Pago").
  const valorDoCampo = (negocio: PipeFacilNegocio, slug: string): string => {
    const valor = negocio.properties?.[slug];
    if (valor === null || valor === undefined || valor === "") return "";
    const opcao = camposPorSlug.get(slug)?.options?.find((o) => o.value === valor);
    return opcao ? opcao.label : String(valor);
  };

  return negocios.map((negocio) => {
    const perdido = negocio.status === "lost";
    const ganho = negocio.status === "won";
    // Para lead perdido, o progresso é o da etapa em que ele estava antes
    // da perda — a etapa "Perda" em si não diz até onde ele chegou.
    const etapaAtual = etapas.get(negocio.stageId);
    const etapaProgresso = perdido
      ? negocio.lostFromStage
        ? etapas.get(negocio.lostFromStage.id)
        : undefined
      : etapaAtual;
    const ordem = etapaProgresso && !etapaProgresso.isLost ? etapaProgresso.order : 0;
    const atingiu = (marco: number | null) =>
      ganho || Boolean(etapaProgresso?.isWon) || (marco !== null && ordem >= marco);

    const agendou = atingiu(marcoAgendado);
    const compareceu = atingiu(marcoCompareceu);
    const converteu = atingiu(marcoConverteu);

    const respostaDoMarco = (
      marco: number | null,
      chegou: boolean,
      chegouNoAnterior: boolean,
    ): RespostaSimNao | null => {
      if (marco === null) return null;
      if (chegou) return "Sim";
      if (!chegouNoAnterior) return null;
      return perdido ? "Não" : "Indefinido";
    };

    const criado = new Date(negocio.createdAt);
    const observacoes = valorDoCampo(negocio, "observacoes") || negocio.notes || "";
    const contato = negocio.contact as { displayName?: string; phone?: string } | null;

    return {
      linha: negocio.seq,
      dataContato: formatoISO.format(criado),
      dataContatoRaw: formatoBR.format(criado),
      vendedor: normalizarRotulo(negocio.responsible?.name ?? ""),
      nomeOuTelefone: negocio.name || contato?.displayName || contato?.phone || "",
      fonte: valorDoCampo(negocio, "fonte"),
      qualificado: atingiu(marcoQualificado),
      procedimento: normalizarRotulo(valorDoCampo(negocio, "procedimento")),
      ticketMedio: negocio.value > 0 ? negocio.value : null,
      status: perdido ? "Desistiu" : agendou ? "Agendado" : "Avaliando",
      statusRaw: etapaAtual?.name ?? "",
      compareceu: respostaDoMarco(marcoCompareceu, compareceu, agendou),
      converteu: respostaDoMarco(marcoConverteu, converteu, compareceu),
      dataAgendamento: valorDoCampo(negocio, "data_de_agendamento").slice(0, 10) || null,
      observacoes,
      ...(perdido && negocio.lostReason ? { motivoPerda: negocio.lostReason } : {}),
    };
  });
}

export type LeadsDoFunil = { ok: true; leads: Lead[]; avisos: string[] } | PipeFacilErro;

// Tudo que o painel precisa de um funil, já no formato de Lead.
export async function buscarLeadsDoFunil(pipelineSeq: number): Promise<LeadsDoFunil> {
  const apiKey = process.env.PIPEFACIL_API_KEY ?? "";
  const [funil, negocios, campos] = await Promise.all([
    buscarFunil(apiKey, pipelineSeq),
    listarNegociosDoFunil(apiKey, pipelineSeq),
    listarCamposDeNegocio(apiKey),
  ]);
  if (!funil.ok) return funil;
  if (!negocios.ok) return negocios;
  if (!campos.ok) return campos;

  const leads = converterNegocios(funil.dados, negocios.dados, campos.dados);

  const avisos: string[] = [];
  if (!campos.dados.some((c) => c.slug === "procedimento")) {
    avisos.push(
      'O PipeFácil não tem um campo "Procedimento" — os gráficos por procedimento ficam sem os leads do CRM.',
    );
  }
  if (leads.length > 0 && leads.every((l) => l.ticketMedio === null)) {
    avisos.push(
      "Nenhum lead do PipeFácil tem valor preenchido — ticket médio e receita projetada ficam sem dados do CRM.",
    );
  }
  return { ok: true, leads, avisos };
}

// Cliente da API pública do PipeFácil (CRM da Match Sales).
// Contrato: https://developers.matchsales.com.br/api/openapi.json
//
// O workspace vem sempre da chave (`pf_live_…`) — nunca é enviado na
// requisição. Na API um lead se chama "deal"; é o mesmo negócio.

import { normalizarRotulo } from "./sheets";
import {
  arquivarMiniatura,
  carregarEnriquecimentos,
  listarMiniaturasArquivadas,
  salvarEnriquecimentos,
  urlMiniaturaArquivada,
} from "./db";
import { chaveDeMiniatura, chaveDeTexto } from "./criativo-chave";
import { buscarIndiceCriativos, criativoDoAnuncio, type IndiceCriativos } from "./meta-ads";
import type { AnuncioOrigem, Criativo, Lead, RespostaSimNao } from "./types";

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

// ---------- Histórico de etapas e anúncio de origem ----------
//
// Os dois exigem uma chamada por lead, então são lidos uma vez e guardados
// (ver db.ts): o anúncio de origem nunca muda, e o histórico só é relido
// quando o lead muda de etapa (stageChangedAt diferente do guardado).

export interface EntradaEtapa {
  etapaId: string;
  em: string; // ISO date-time
  // Só na entrada de criação do lead: a mensagem que abriu a conversa.
  criacao?: boolean;
  mensagem?: string | null;
}

export interface EnriquecimentoNegocio {
  seq: number;
  etapaAlteradaEm: string | null;
  historico: EntradaEtapa[] | null;
  anuncio: AnuncioOrigem | null;
  anuncioLido: boolean;
}

interface Atividade {
  type: string;
  changes: { to?: string } | null;
  metadata: { stageId?: string; triggerMessage?: string } | null;
  occurredAt: string;
}

export async function buscarHistoricoDeEtapas(
  apiKey: string,
  seq: number,
): Promise<Resultado<EntradaEtapa[]>> {
  const entradas: EntradaEtapa[] = [];
  let cursor: string | null = null;
  // Um lead raramente passa de algumas dezenas de mudanças de etapa; o teto
  // só protege contra paginação sem fim.
  for (let pagina = 0; pagina < 5; pagina++) {
    const query = new URLSearchParams({ limit: "50" });
    query.append("type", "STAGE_CHANGED");
    query.append("type", "DEAL_CREATED");
    if (cursor) query.set("cursor", cursor);
    const res: Resultado<{ items: Atividade[]; nextCursor: string | null; hasMore: boolean }> =
      await requisitar(apiKey, `/api/v1/deals/${seq}/activities?${query}`);
    if (!res.ok) return res;
    for (const a of res.dados.items) {
      const etapaId = a.type === "STAGE_CHANGED" ? a.changes?.to : a.metadata?.stageId;
      if (!etapaId) continue;
      entradas.push(
        a.type === "DEAL_CREATED"
          ? { etapaId, em: a.occurredAt, criacao: true, mensagem: a.metadata?.triggerMessage ?? null }
          : { etapaId, em: a.occurredAt },
      );
    }
    cursor = res.dados.hasMore ? res.dados.nextCursor : null;
    if (!cursor) break;
  }
  return { ok: true, dados: entradas };
}

interface Mensagem {
  direction: string;
  timestamp: string;
  content: {
    referral?: {
      sourceUrl?: string;
      headline?: string;
      body?: string;
      mediaType?: string;
      thumbnailUrl?: string;
      imageUrl?: string;
    } | null;
  } | null;
}

interface Rastreio {
  utmReferrer: string | null;
  ctwaClid: string | null;
}

// O rastreio do lead (só presente na consulta individual, não na listagem)
// guarda o link do post do anúncio de clique para WhatsApp e o ctwa_clid.
// Texto e miniatura do anúncio só existem na mensagem que abriu a conversa,
// então ela é lida apenas quando o criativo ainda não é conhecido.
export async function buscarAnuncioDeOrigem(
  apiKey: string,
  negocio: PipeFacilNegocio,
  conhecidos: Map<string, AnuncioOrigem>,
): Promise<Resultado<AnuncioOrigem | null>> {
  const detalhe = await requisitar<{ tracking: Rastreio | null }>(apiKey, `/api/v1/deals/${negocio.seq}`);
  if (!detalhe.ok) return detalhe;
  const rastreio = detalhe.dados.tracking;
  const url = rastreio?.ctwaClid ? rastreio.utmReferrer : null;
  if (!url) return { ok: true, dados: null };

  const conhecido = conhecidos.get(url);
  if (conhecido) return { ok: true, dados: conhecido };

  const [daMensagem, postId] = await Promise.all([
    buscarAnuncioNasMensagens(apiKey, negocio, url),
    resolverPostFacebook(url),
  ]);
  if (!daMensagem.ok) return daMensagem;
  return {
    ok: true,
    dados: {
      ...(daMensagem.dados ?? { url, titulo: "", texto: "", miniatura: null, tipoMidia: null }),
      postId,
    },
  };
}

// O link fb.me do anúncio redireciona para o post da página; o ID do post é
// o que liga o anúncio ao criativo na conta do Meta (ver criativoDoAnuncio).
// Alguns posts têm ID cifrado (pfbid…), que não serve para isso.
export async function resolverPostFacebook(url: string): Promise<string | null> {
  if (!/^https?:\/\/fb\.me\//.test(url)) return null;
  try {
    const res = await fetch(url, { method: "HEAD", redirect: "manual", cache: "no-store" });
    const destino = res.headers.get("location") ?? "";
    return destino.match(/story_fbid=(\d+)/)?.[1] ?? destino.match(/\/(?:posts|videos|reel)\/(\d+)/)?.[1] ?? null;
  } catch {
    return null;
  }
}

// As páginas de mensagens vêm da mais recente para a mais antiga, e o
// histórico é do contato (não só deste lead): volta página a página até a
// criação do lead, onde está a mensagem que veio do anúncio.
const TOLERANCIA_CRIACAO_MS = 5 * 60_000;
const MAX_PAGINAS_MENSAGENS = 6;

async function buscarAnuncioNasMensagens(
  apiKey: string,
  negocio: PipeFacilNegocio,
  url: string,
): Promise<Resultado<AnuncioOrigem | null>> {
  const desde = new Date(negocio.createdAt).getTime() - TOLERANCIA_CRIACAO_MS;
  let cursor: string | null = null;
  for (let pagina = 0; pagina < MAX_PAGINAS_MENSAGENS; pagina++) {
    const query = new URLSearchParams({ limit: "50" });
    if (cursor) query.set("cursor", cursor);
    const res: Resultado<{ items: Mensagem[]; nextCursor: string | null; hasMore: boolean }> =
      await requisitar(apiKey, `/api/v1/deals/${negocio.seq}/messages?${query}`);
    if (!res.ok) return res;
    const itens = res.dados.items;
    const r = itens.find((m) => m.direction === "inbound" && m.content?.referral?.sourceUrl === url)
      ?.content?.referral;
    if (r) {
      return {
        ok: true,
        dados: {
          url,
          titulo: r.headline ?? "",
          texto: r.body ?? "",
          miniatura: r.thumbnailUrl ?? r.imageUrl ?? null,
          tipoMidia: r.mediaType ?? null,
        },
      };
    }
    const maisAntiga = itens[0];
    const passouDaCriacao = maisAntiga !== undefined && new Date(maisAntiga.timestamp).getTime() < desde;
    cursor = res.dados.hasMore && !passouDaCriacao ? res.dados.nextCursor : null;
    if (!cursor) break;
  }
  return { ok: true, dados: null };
}

// ---------- Conversão negócio -> Lead do dashboard ----------

interface MarcosDoFunil {
  etapas: Map<string, PipeFacilEtapa>;
  qualificado: number | null;
  agendado: number | null;
  compareceu: number | null;
  converteu: number | null;
}

function marcosDoFunil(funil: PipeFacilFunil): MarcosDoFunil {
  return {
    etapas: new Map(funil.stages.map((s) => [s.id, s])),
    qualificado:
      ordemDoMarco(funil, NOMES_MARCO.qualificado) ??
      // Funil sem etapa "Qualificados": qualquer avanço além da etapa de
      // entrada conta como qualificado.
      funil.stages.filter((s) => !s.isWon && !s.isLost)[1]?.order ??
      null,
    agendado: ordemDoMarco(funil, NOMES_MARCO.agendado),
    compareceu: ordemDoMarco(funil, NOMES_MARCO.compareceu),
    converteu: ordemDoMarco(funil, NOMES_MARCO.converteu),
  };
}

// Até onde o lead chegou no funil, olhando a etapa atual (ou, para lead
// perdido, a etapa em que ele estava antes da perda — a etapa "Perda" em si
// não diz até onde ele chegou).
function progressoDoNegocio(negocio: PipeFacilNegocio, m: MarcosDoFunil) {
  const perdido = negocio.status === "lost";
  const etapaAtual = m.etapas.get(negocio.stageId);
  const etapaProgresso = perdido
    ? negocio.lostFromStage
      ? m.etapas.get(negocio.lostFromStage.id)
      : undefined
    : etapaAtual;
  const ordem = etapaProgresso && !etapaProgresso.isLost ? etapaProgresso.order : 0;
  const ganho = negocio.status === "won" || Boolean(etapaProgresso?.isWon);
  const atingiu = (marco: number | null) => ganho || (marco !== null && ordem >= marco);
  return { perdido, etapaAtual, atingiu };
}

// Só lead que passou da etapa de entrada tem datas de etapa a descobrir.
function precisaDeHistorico(negocio: PipeFacilNegocio, m: MarcosDoFunil): boolean {
  return progressoDoNegocio(negocio, m).atingiu(m.qualificado);
}

// Mensagem que abriu a conversa (do registro de criação do lead). Ajuda a
// entender a origem de quem chegou sem anúncio identificado.
function primeiraMensagem(e: EnriquecimentoNegocio | undefined): string | null | undefined {
  const criacao = e?.historico?.find((x) => x.criacao);
  return criacao ? (criacao.mensagem ?? null) : undefined;
}

export function converterNegocios(
  funil: PipeFacilFunil,
  negocios: PipeFacilNegocio[],
  campos: PipeFacilCampo[],
  enriquecimentos: Map<number, EnriquecimentoNegocio> = new Map(),
  identificar: (anuncio: AnuncioOrigem) => string = (a) => chaveDoCriativo(a),
): Lead[] {
  const m = marcosDoFunil(funil);
  const camposPorSlug = new Map(campos.map((c) => [c.slug, c]));

  // Campo de seleção guarda o valor interno ("trafego_pago"); o dashboard
  // mostra o rótulo ("Tráfego Pago").
  const valorDoCampo = (negocio: PipeFacilNegocio, slug: string): string => {
    const valor = negocio.properties?.[slug];
    if (valor === null || valor === undefined || valor === "") return "";
    const opcao = camposPorSlug.get(slug)?.options?.find((o) => o.value === valor);
    return opcao ? opcao.label : String(valor);
  };

  return negocios.map((negocio) => {
    const { perdido, etapaAtual, atingiu } = progressoDoNegocio(negocio, m);
    const agendou = atingiu(m.agendado);
    const compareceu = atingiu(m.compareceu);
    const converteu = atingiu(m.converteu);

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

    // Data em que o lead entrou pela primeira vez numa etapa igual ou
    // posterior ao marco. Sem histórico lido ainda, a melhor aproximação é
    // a última mudança de etapa.
    const enriquecimento = enriquecimentos.get(negocio.seq);
    const historico = enriquecimento?.historico ?? [];
    const dataDoMarco = (marco: number | null): string | null => {
      if (!atingiu(marco)) return null;
      const datas = historico
        .filter((e) => {
          const etapa = m.etapas.get(e.etapaId);
          return etapa && !etapa.isLost && (etapa.isWon || (marco !== null && etapa.order >= marco));
        })
        .map((e) => e.em)
        .sort();
      const em = datas[0] ?? (perdido ? negocio.createdAt : negocio.stageChangedAt);
      return formatoISO.format(new Date(em));
    };

    const criado = new Date(negocio.createdAt);
    const observacoes = valorDoCampo(negocio, "observacoes") || negocio.notes || "";
    const contato = negocio.contact as { displayName?: string; phone?: string } | null;

    return {
      linha: negocio.seq,
      fonteDados: "pipefacil",
      dataContato: formatoISO.format(criado),
      dataContatoRaw: formatoBR.format(criado),
      vendedor: normalizarRotulo(negocio.responsible?.name ?? ""),
      nomeOuTelefone: negocio.name || contato?.displayName || contato?.phone || "",
      fonte: valorDoCampo(negocio, "fonte"),
      qualificado: atingiu(m.qualificado),
      procedimento: normalizarRotulo(valorDoCampo(negocio, "procedimento")),
      ticketMedio: negocio.value > 0 ? negocio.value : null,
      status: perdido ? "Desistiu" : agendou ? "Agendado" : "Avaliando",
      statusRaw: etapaAtual?.name ?? "",
      compareceu: respostaDoMarco(m.compareceu, compareceu, agendou),
      converteu: respostaDoMarco(m.converteu, converteu, compareceu),
      dataAgendamento: valorDoCampo(negocio, "data_de_agendamento").slice(0, 10) || null,
      observacoes,
      ...(perdido && negocio.lostReason ? { motivoPerda: negocio.lostReason } : {}),
      marcos: {
        qualificado: dataDoMarco(m.qualificado),
        agendado: dataDoMarco(m.agendado),
        compareceu: dataDoMarco(m.compareceu),
        converteu: dataDoMarco(m.converteu),
        desistiu: perdido
          ? formatoISO.format(new Date(negocio.closedAt ?? negocio.stageChangedAt))
          : null,
      },
      anuncio: enriquecimento?.anuncioLido
        ? enriquecimento.anuncio
          ? identificar(enriquecimento.anuncio)
          : null
        : undefined,
    };
  });
}

// ---------- Criativos: agrupamento e miniaturas ----------

// O mesmo criativo vira um post diferente em cada anúncio e posicionamento
// (Instagram, Facebook via fb.me). Vídeo é reconhecido pelo arquivo da
// miniatura; imagem, pela conta de anúncios do Meta quando configurada, e
// senão pelo texto (ver criativo-chave.ts). Sem nada disso, cada post fica
// sozinho.
export function chaveDoCriativo(
  anuncio: AnuncioOrigem,
  indice: IndiceCriativos | null = null,
  miniaturasAmbiguas: Set<string> = new Set(),
): string {
  const daMiniatura = chaveDeMiniatura(anuncio.miniatura);
  return (
    (indice ? criativoDoAnuncio(anuncio, indice) : null) ??
    (daMiniatura && !miniaturasAmbiguas.has(daMiniatura) ? daMiniatura : null) ??
    chaveDeTexto(anuncio.texto) ??
    anuncio.url
  );
}

// Miniatura que aparece em anúncios de textos diferentes não é do vídeo:
// é uma imagem genérica (ex.: foto de perfil em post impulsionado) e
// juntaria criativos distintos.
export function miniaturasAmbiguas(anuncios: AnuncioOrigem[]): Set<string> {
  const textos = new Map<string, Set<string>>();
  for (const a of anuncios) {
    const chave = chaveDeMiniatura(a.miniatura);
    const texto = chaveDeTexto(a.texto);
    if (!chave || !texto) continue;
    if (!textos.has(chave)) textos.set(chave, new Set());
    textos.get(chave)!.add(texto);
  }
  return new Set([...textos].filter(([, t]) => t.size > 1).map(([chave]) => chave));
}

// Agrupa os anúncios de origem dos leads em criativos. O link do post
// exibido é o que mais trouxe leads. A miniatura é, nessa ordem: a cópia
// arquivada, a atual da conta de anúncios do Meta ou a da mensagem mais
// recente (as mais antigas já expiraram).
export function agruparCriativos(
  negocios: PipeFacilNegocio[],
  enriquecimentos: Map<number, EnriquecimentoNegocio>,
  arquivadas: Set<string>,
  indice: IndiceCriativos | null,
  identificar: (anuncio: AnuncioOrigem) => string,
): Record<string, Criativo> {
  const grupos = new Map<
    string,
    { anuncio: AnuncioOrigem; maisRecente: string; posts: Map<string, number> }
  >();
  for (const n of negocios) {
    const anuncio = enriquecimentos.get(n.seq)?.anuncio;
    if (!anuncio) continue;
    const chave = identificar(anuncio);
    const g = grupos.get(chave);
    if (!g) {
      grupos.set(chave, { anuncio, maisRecente: n.createdAt, posts: new Map([[anuncio.url, 1]]) });
      continue;
    }
    g.posts.set(anuncio.url, (g.posts.get(anuncio.url) ?? 0) + 1);
    if (n.createdAt > g.maisRecente && anuncio.miniatura) {
      g.anuncio = anuncio;
      g.maisRecente = n.createdAt;
    }
  }

  const criativos: Record<string, Criativo> = {};
  for (const [chave, g] of grupos) {
    const postPrincipal = [...g.posts.entries()].sort((a, b) => b[1] - a[1])[0][0];
    const naConta = indice?.criativos.get(chave);
    // Texto que bate com várias imagens da conta: o lead veio de uma delas,
    // mas o post não diz qual.
    const imagensPossiveis = chave.startsWith("txt_") ? (indice?.imagensPorTexto.get(chave)?.length ?? 0) : 0;
    criativos[chave] = {
      chave,
      url: postPrincipal,
      posts: g.posts.size,
      titulo: g.anuncio.titulo,
      texto: g.anuncio.texto,
      tipoMidia: g.anuncio.tipoMidia,
      miniatura: arquivadas.has(chave)
        ? urlMiniaturaArquivada(chave)
        : (naConta?.miniatura ?? g.anuncio.miniatura),
      // Com a conta lida, criativo que não está nela é de outra conta ou já
      // foi apagado — conta como fora do ar.
      ativo: naConta ? naConta.ativo : indice && imagensPossiveis < 2 ? false : null,
      variacoes: imagensPossiveis > 1 ? imagensPossiveis : null,
    };
  }

  // Criativos no ar que ainda não trouxeram nenhum lead também aparecem —
  // saber que um anúncio está rodando sem gerar conversa é informação.
  for (const [chave, naConta] of indice?.criativos ?? []) {
    if (!naConta.ativo || criativos[chave]) continue;
    criativos[chave] = {
      chave,
      url: naConta.url ?? "",
      posts: 0,
      titulo: "",
      texto: naConta.texto,
      tipoMidia: naConta.tipoMidia,
      miniatura: arquivadas.has(chave) ? urlMiniaturaArquivada(chave) : naConta.miniatura,
      ativo: true,
      variacoes: null,
    };
  }
  return criativos;
}

// Cada miniatura sem cópia é tentada uma vez por processo: link expirado do
// Meta não volta a funcionar, e não vale repetir a tentativa a cada 25 s.
declare global {
  var __miniaturasTentadas: Set<string> | undefined;
}

async function arquivarMiniaturasNovas(
  criativos: Record<string, Criativo>,
  arquivadas: Set<string>,
): Promise<void> {
  if (!global.__miniaturasTentadas) global.__miniaturasTentadas = new Set();
  const tentadas = global.__miniaturasTentadas;
  const pendentes = Object.values(criativos).filter(
    (c) => c.miniatura && !arquivadas.has(c.chave) && !tentadas.has(c.miniatura),
  );
  await emParalelo(pendentes, async (c) => {
    tentadas.add(c.miniatura!);
    if (await arquivarMiniatura(c.chave, c.miniatura!)) {
      arquivadas.add(c.chave);
      c.miniatura = urlMiniaturaArquivada(c.chave);
    }
  });
}

// ---------- Leitura completa de um funil ----------

// Cache em memória na frente do banco: evita reler do Supabase a cada
// atualização do painel (a cada 25 s) e mantém a integração funcionando
// mesmo se a tabela ainda não existir.
declare global {
  var __pipefacilEnriquecimentos: Map<number, EnriquecimentoNegocio> | undefined;
}

function memoria(): Map<number, EnriquecimentoNegocio> {
  if (!global.__pipefacilEnriquecimentos) global.__pipefacilEnriquecimentos = new Map();
  return global.__pipefacilEnriquecimentos;
}

// Teto de chamadas extras ao CRM por leitura de funil. O painel relê a cada
// 25 s, então os leads novos entram em segundos, e a carga inicial de um
// funil grande se completa em poucos minutos sem chegar perto do limite de
// 600 requisições por minuto do PipeFácil.
const ORCAMENTO_ENRIQUECIMENTO = 40;
const CONCORRENCIA = 4;

async function emParalelo<T>(itens: T[], fn: (item: T) => Promise<void>): Promise<void> {
  let proximo = 0;
  const trabalhador = async () => {
    while (proximo < itens.length) await fn(itens[proximo++]);
  };
  await Promise.all(Array.from({ length: Math.min(CONCORRENCIA, itens.length) }, trabalhador));
}

export async function enriquecerNegocios(
  apiKey: string,
  funil: PipeFacilFunil,
  negocios: PipeFacilNegocio[],
  orcamento = ORCAMENTO_ENRIQUECIMENTO,
): Promise<Map<number, EnriquecimentoNegocio>> {
  const cache = memoria();
  const faltando = negocios.filter((n) => !cache.has(n.seq)).map((n) => n.seq);
  if (faltando.length) {
    for (const e of await carregarEnriquecimentos(faltando)) cache.set(e.seq, e);
  }

  const m = marcosDoFunil(funil);
  const atual = (n: PipeFacilNegocio): EnriquecimentoNegocio =>
    cache.get(n.seq) ?? {
      seq: n.seq,
      etapaAlteradaEm: null,
      historico: null,
      anuncio: null,
      anuncioLido: false,
    };

  // Histórico primeiro: ele corrige números do funil; o anúncio só alimenta
  // a seção de criativos. Os mais recentes antes, que é onde o painel olha.
  const recentes = [...negocios].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  // Por último, o histórico só pela primeira mensagem (lead que ainda está
  // na etapa de entrada, ou lido antes de a mensagem ser guardada).
  const tarefas: { negocio: PipeFacilNegocio; tipo: "historico" | "anuncio" }[] = [
    ...recentes
      .filter((n) => precisaDeHistorico(n, m) && atual(n).etapaAlteradaEm !== n.stageChangedAt)
      .map((negocio) => ({ negocio, tipo: "historico" as const })),
    ...recentes
      .filter((n) => !atual(n).anuncioLido)
      .map((negocio) => ({ negocio, tipo: "anuncio" as const })),
    ...recentes
      .filter(
        (n) =>
          primeiraMensagem(atual(n)) === undefined &&
          !(precisaDeHistorico(n, m) && atual(n).etapaAlteradaEm !== n.stageChangedAt),
      )
      .map((negocio) => ({ negocio, tipo: "historico" as const })),
  ].slice(0, orcamento);

  // Criativos já conhecidos (com texto e miniatura), para não reler as
  // mensagens de cada lead que veio do mesmo anúncio.
  const conhecidos = new Map<string, AnuncioOrigem>();
  for (const e of cache.values()) {
    if (e.anuncio && (e.anuncio.texto || e.anuncio.miniatura)) conhecidos.set(e.anuncio.url, e.anuncio);
  }

  const alterados = new Map<number, EnriquecimentoNegocio>();
  await emParalelo(tarefas, async ({ negocio, tipo }) => {
    if (tipo === "historico") {
      const res = await buscarHistoricoDeEtapas(apiKey, negocio.seq);
      if (!res.ok) return;
      const novo = { ...atual(negocio), historico: res.dados, etapaAlteradaEm: negocio.stageChangedAt };
      cache.set(negocio.seq, novo);
      alterados.set(negocio.seq, novo);
    } else {
      const res = await buscarAnuncioDeOrigem(apiKey, negocio, conhecidos);
      if (!res.ok) return;
      if (res.dados && (res.dados.texto || res.dados.miniatura)) conhecidos.set(res.dados.url, res.dados);
      const novo = { ...atual(negocio), anuncio: res.dados, anuncioLido: true };
      cache.set(negocio.seq, novo);
      alterados.set(negocio.seq, novo);
    }
  });
  if (alterados.size) await salvarEnriquecimentos([...alterados.values()]);

  return new Map(
    negocios.flatMap((n): [number, EnriquecimentoNegocio][] =>
      cache.has(n.seq) ? [[n.seq, cache.get(n.seq)!]] : [],
    ),
  );
}

// ---------- Origem de quem chegou sem anúncio identificado ----------

function normalizarMensagem(texto: string): string {
  return texto.toLowerCase().replace(/\s+/g, " ").replace(/[.!?\s]+$/, "").trim();
}

const MENSAGEM_INDISPONIVEL = /this message is currently unavailable/i;
// Mensagem pronta de anúncio: a que pelo menos tantos leads com anúncio
// identificado usaram para abrir a conversa, neste mesmo funil.
const MINIMO_LEADS_MENSAGEM_DE_ANUNCIO = 3;
// Outra mensagem pronta (link da bio, botão do site…): repetida por pelo
// menos tantos leads, e longa o bastante para não ser um "bom dia".
const MINIMO_LEADS_MENSAGEM_PRONTA = 5;
const TAMANHO_MINIMO_MENSAGEM_PRONTA = 20;

// Para o lead sem anúncio de origem, a mensagem que abriu a conversa diz
// muito: a mesma mensagem pronta dos anúncios indica que veio do anúncio e
// o clique não foi registrado; "This message is currently unavailable" é a
// mensagem que o CRM não conseguiu receber (justamente a que traria o
// anúncio); outra frase repetida é um link com texto pronto.
function classificarSemAnuncio(
  leads: Lead[],
  negocios: PipeFacilNegocio[],
  enriquecimentos: Map<number, EnriquecimentoNegocio>,
): void {
  const mensagemDe = new Map<number, string>();
  for (const n of negocios) {
    const msg = primeiraMensagem(enriquecimentos.get(n.seq));
    if (msg) mensagemDe.set(n.seq, normalizarMensagem(msg));
  }

  const deAnuncio = new Map<string, number>();
  const repeticoes = new Map<string, number>();
  for (const lead of leads) {
    const msg = mensagemDe.get(lead.linha);
    if (!msg) continue;
    repeticoes.set(msg, (repeticoes.get(msg) ?? 0) + 1);
    if (lead.anuncio) deAnuncio.set(msg, (deAnuncio.get(msg) ?? 0) + 1);
  }

  for (const lead of leads) {
    if (lead.anuncio !== null) continue;
    const msg = mensagemDe.get(lead.linha);
    if (!msg) {
      lead.semAnuncio = { tipo: "sem_rastro" };
    } else if (MENSAGEM_INDISPONIVEL.test(msg)) {
      lead.semAnuncio = { tipo: "mensagem_indisponivel" };
    } else if ((deAnuncio.get(msg) ?? 0) >= MINIMO_LEADS_MENSAGEM_DE_ANUNCIO) {
      lead.semAnuncio = { tipo: "anuncio_sem_clique" };
    } else if (
      (repeticoes.get(msg) ?? 0) >= MINIMO_LEADS_MENSAGEM_PRONTA &&
      msg.length >= TAMANHO_MINIMO_MENSAGEM_PRONTA
    ) {
      lead.semAnuncio = { tipo: "mensagem_pronta", mensagem: msg };
    } else {
      lead.semAnuncio = { tipo: "sem_rastro" };
    }
  }
}

export type LeadsDoFunil =
  | { ok: true; leads: Lead[]; anuncios: Record<string, Criativo>; avisos: string[] }
  | PipeFacilErro;

// Tudo que o painel precisa de um funil, já no formato de Lead.
// Conta de anúncios do Meta do cliente, quando configurada: dá miniatura e
// status (no ar ou não) aos criativos.
export interface ContaMeta {
  adAccountId: string;
  token: string;
}

// Conta grande (centenas de anúncios) leva vários segundos para listar. O
// painel não espera mais que isso: segue sem os dados do Meta e os mostra na
// próxima atualização, quando o índice (que continua carregando) já estiver
// em cache.
const ESPERA_MAXIMA_INDICE_MS = 3_000;

function indiceSemBloquear(conta: ContaMeta): Promise<IndiceCriativos | null> {
  return Promise.race([
    buscarIndiceCriativos(conta.adAccountId, conta.token),
    new Promise<null>((resolve) => setTimeout(() => resolve(null), ESPERA_MAXIMA_INDICE_MS)),
  ]);
}

export async function buscarLeadsDoFunil(
  pipelineSeq: number,
  contaMeta?: ContaMeta,
): Promise<LeadsDoFunil> {
  const apiKey = process.env.PIPEFACIL_API_KEY ?? "";
  const [funil, negocios, campos] = await Promise.all([
    buscarFunil(apiKey, pipelineSeq),
    listarNegociosDoFunil(apiKey, pipelineSeq),
    listarCamposDeNegocio(apiKey),
  ]);
  if (!funil.ok) return funil;
  if (!negocios.ok) return negocios;
  if (!campos.ok) return campos;

  const [enriquecimentos, arquivadas, indice] = await Promise.all([
    enriquecerNegocios(apiKey, funil.dados, negocios.dados),
    listarMiniaturasArquivadas(),
    contaMeta ? indiceSemBloquear(contaMeta) : Promise.resolve(null),
  ]);
  const ambiguas = miniaturasAmbiguas(
    [...enriquecimentos.values()].flatMap((e) => (e.anuncio ? [e.anuncio] : [])),
  );
  const identificar = (a: AnuncioOrigem) => chaveDoCriativo(a, indice, ambiguas);
  const leads = converterNegocios(funil.dados, negocios.dados, campos.dados, enriquecimentos, identificar);

  // Os dados do anúncio vão uma vez por criativo, não repetidos em cada lead.
  const anuncios = agruparCriativos(negocios.dados, enriquecimentos, arquivadas, indice, identificar);
  await arquivarMiniaturasNovas(anuncios, arquivadas);

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
  classificarSemAnuncio(leads, negocios.dados, enriquecimentos);
  return { ok: true, leads, anuncios, avisos };
}

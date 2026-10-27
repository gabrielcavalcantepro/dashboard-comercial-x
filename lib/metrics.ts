import type { Criativo, DatasMarcos, Lead, StatusLead } from "./types";
import { categorizarMotivo, type MotivoDesistencia } from "./reason-categorize";
import {
  addDaysISO,
  daysBetween,
  formatDayMonth,
  formatDayMonthShort,
  formatMonthYear,
  weekdayShort,
} from "./format";

export interface Periodo {
  inicio: string; // ISO
  fim: string; // ISO
}

export interface Filtros {
  periodo: Periodo | null; // null = todo o período disponível
  vendedores: string[]; // vazio = todos
  fontes: string[];
  procedimentos: string[];
  statuses: StatusLead[];
}

export const FILTROS_VAZIOS: Filtros = {
  periodo: null,
  vendedores: [],
  fontes: [],
  procedimentos: [],
  statuses: [],
};

// "Resgate" é lead que a equipe já tinha e voltou a trabalhar — não é uma
// chegada nova. Métricas sobre volume/padrão de chegada de leads (evolução
// no tempo, dia da semana) excluem essa fonte; métricas de conversão do
// funil (qualificação, fechamento, desistência) continuam considerando
// todos os leads, já que um lead de Resgate passa pelo funil normalmente.
const FONTE_RESGATE = "Resgate";

export function excluirResgate(leads: Lead[]): Lead[] {
  return leads.filter((l) => l.fonte !== FONTE_RESGATE);
}

// Lead da planilha não tem histórico de etapas: tudo que ele atingiu fica
// datado no dia do contato, o que mantém para ele a leitura por safra.
export function marcosDoLead(lead: Lead): DatasMarcos {
  if (lead.marcos) return lead.marcos;
  const d = lead.dataContato;
  return {
    qualificado: lead.qualificado ? d : null,
    agendado: lead.status === "Agendado" ? d : null,
    compareceu: lead.compareceu === "Sim" ? d : null,
    converteu: lead.converteu === "Sim" ? d : null,
    desistiu: lead.status === "Desistiu" ? d : null,
  };
}

// Lead projetado num período chegou nele ou só teve um evento nele; fora
// de um período todo lead conta como chegada.
export function chegou(lead: Lead): boolean {
  return lead.chegou !== false;
}

function dentro(data: string | null, periodo: Periodo): boolean {
  return data !== null && data >= periodo.inicio && data <= periodo.fim;
}

// Recorte por data do evento: o lead conta como chegada se o contato foi no
// período, e cada etapa (qualificou, agendou, compareceu, converteu,
// desistiu) conta se aconteceu no período — mesmo que o lead tenha chegado
// antes. Devolve null se nada dele aconteceu no período.
export function projetarNoPeriodo(lead: Lead, periodo: Periodo): Lead | null {
  const m = marcosDoLead(lead);
  const chegouNoPeriodo = dentro(lead.dataContato, periodo);
  const qualificou = dentro(m.qualificado, periodo);
  const agendou = dentro(m.agendado, periodo);
  const compareceu = dentro(m.compareceu, periodo);
  const converteu = dentro(m.converteu, periodo);
  const desistiu = dentro(m.desistiu, periodo);
  if (!chegouNoPeriodo && !qualificou && !agendou && !compareceu && !converteu && !desistiu) {
    return null;
  }

  let status: StatusLead | null = "Avaliando";
  if (desistiu) status = "Desistiu";
  else if (agendou) status = "Agendado";
  else if (lead.status === null && chegouNoPeriodo) status = null;

  return {
    ...lead,
    chegou: chegouNoPeriodo,
    qualificado: qualificou,
    status,
    compareceu: compareceu ? "Sim" : lead.compareceu === null ? null : "Indefinido",
    converteu: converteu ? "Sim" : lead.converteu === null ? null : "Indefinido",
  };
}

export function filtrarLeads(leads: Lead[], filtros: Filtros): Lead[] {
  const recorte = filtros.periodo
    ? leads.flatMap((l) => projetarNoPeriodo(l, filtros.periodo!) ?? [])
    : leads;
  return recorte.filter((lead) => {
    if (filtros.vendedores.length && !filtros.vendedores.includes(lead.vendedor))
      return false;
    if (filtros.fontes.length && !filtros.fontes.includes(lead.fonte))
      return false;
    if (
      filtros.procedimentos.length &&
      !filtros.procedimentos.includes(lead.procedimento)
    )
      return false;
    if (
      filtros.statuses.length &&
      (!lead.status || !filtros.statuses.includes(lead.status))
    )
      return false;
    return true;
  });
}

export interface OpcoesFiltro {
  vendedores: string[];
  fontes: string[];
  procedimentos: string[];
}

export function obterOpcoesFiltro(leads: Lead[]): OpcoesFiltro {
  const uniq = (arr: string[]) =>
    Array.from(new Set(arr.filter(Boolean))).sort((a, b) =>
      a.localeCompare(b, "pt-BR"),
    );
  return {
    vendedores: uniq(leads.map((l) => l.vendedor)),
    fontes: uniq(leads.map((l) => l.fonte)),
    procedimentos: uniq(leads.map((l) => l.procedimento)),
  };
}

// ---------- KPIs ----------

export interface KpiValues {
  totalLeads: number;
  qualificados: number;
  agendamentos: number;
  emAvaliacao: number;
  desistiu: number;
  taxaQualificacao: number | null;
  taxaAgendamento: number | null;
  taxaDesistencia: number | null;
  ticketMedio: number | null;
  receitaProjetada: number;
}

export function computeKpis(leads: Lead[]): KpiValues {
  const totalLeads = leads.filter(chegou).length;
  const qualificados = leads.filter((l) => l.qualificado).length;
  const agendamentos = leads.filter((l) => l.status === "Agendado").length;
  const emAvaliacao = leads.filter((l) => l.status === "Avaliando").length;
  const desistiu = leads.filter((l) => l.status === "Desistiu").length;

  const comTicket = leads.filter((l) => chegou(l) && l.ticketMedio !== null);
  const ticketMedio = comTicket.length
    ? comTicket.reduce((s, l) => s + (l.ticketMedio ?? 0), 0) / comTicket.length
    : null;

  const receitaProjetada = leads
    .filter((l) => l.status === "Agendado" && l.ticketMedio !== null)
    .reduce((s, l) => s + (l.ticketMedio ?? 0), 0);

  return {
    totalLeads,
    qualificados,
    agendamentos,
    emAvaliacao,
    desistiu,
    taxaQualificacao: totalLeads ? (qualificados / totalLeads) * 100 : null,
    taxaAgendamento: qualificados ? (agendamentos / qualificados) * 100 : null,
    taxaDesistencia: totalLeads ? (desistiu / totalLeads) * 100 : null,
    ticketMedio,
    receitaProjetada,
  };
}

export function variacaoRelativa(
  atual: number | null,
  anterior: number | null,
): number | null {
  if (atual === null || anterior === null) return null;
  if (anterior === 0) return atual === 0 ? 0 : null;
  return ((atual - anterior) / anterior) * 100;
}

export function variacaoPontos(
  atual: number | null,
  anterior: number | null,
): number | null {
  if (atual === null || anterior === null) return null;
  return atual - anterior;
}

export function periodoAnteriorEquivalente(periodo: Periodo): Periodo {
  const duracaoDias = daysBetween(periodo.inicio, periodo.fim) + 1;
  const fim = addDaysISO(periodo.inicio, -1);
  const inicio = addDaysISO(fim, -(duracaoDias - 1));
  return { inicio, fim };
}

// ---------- Funil ----------

export interface EtapaFunil {
  rotulo: string;
  valor: number;
  percentualDoTotal: number;
  percentualDaEtapaAnterior: number | null;
}

export function computeFunil(leads: Lead[]): EtapaFunil[] {
  const total = leads.filter(chegou).length;
  const qualificados = leads.filter((l) => l.qualificado).length;
  const agendados = leads.filter((l) => l.status === "Agendado").length;

  const pct = (v: number) => (total ? (v / total) * 100 : 0);

  const etapas: EtapaFunil[] = [
    { rotulo: "Total", valor: total, percentualDoTotal: 100, percentualDaEtapaAnterior: null },
    {
      rotulo: "Qualificados",
      valor: qualificados,
      percentualDoTotal: pct(qualificados),
      percentualDaEtapaAnterior: total ? (qualificados / total) * 100 : null,
    },
    {
      rotulo: "Agendados",
      valor: agendados,
      percentualDoTotal: pct(agendados),
      percentualDaEtapaAnterior: qualificados
        ? (agendados / qualificados) * 100
        : null,
    },
  ];

  // "Comparecidos" e "Convertidos" só entram no funil se a fonte tiver esse
  // dado (colunas "Compareceu?" e "Converteu?" na planilha, ou as etapas
  // equivalentes no funil do PipeFácil) — clientes sem isso continuam com
  // o funil de 3 etapas, sem mostrar um "0%" enganoso.
  const temComparecimento = leads.some((l) => l.compareceu !== null);
  if (temComparecimento) {
    const comparecidos = leads.filter((l) => l.compareceu === "Sim").length;
    etapas.push({
      rotulo: "Comparecidos",
      valor: comparecidos,
      percentualDoTotal: pct(comparecidos),
      percentualDaEtapaAnterior: agendados ? (comparecidos / agendados) * 100 : null,
    });

    const temConversao = leads.some((l) => l.converteu !== null);
    if (temConversao) {
      const convertidos = leads.filter((l) => l.converteu === "Sim").length;
      etapas.push({
        rotulo: "Convertidos",
        valor: convertidos,
        percentualDoTotal: pct(convertidos),
        percentualDaEtapaAnterior: comparecidos ? (convertidos / comparecidos) * 100 : null,
      });
    }
  }

  return etapas;
}

// ---------- Distribuições genéricas ----------

export interface ContagemItem {
  chave: string;
  total: number;
}

export function contarPor(
  leads: Lead[],
  chaveFn: (l: Lead) => string,
): ContagemItem[] {
  const mapa = new Map<string, number>();
  for (const lead of leads.filter(chegou)) {
    const chave = chaveFn(lead);
    mapa.set(chave, (mapa.get(chave) ?? 0) + 1);
  }
  return Array.from(mapa.entries())
    .map(([chave, total]) => ({ chave, total }))
    .sort((a, b) => b.total - a.total);
}

export function ticketMedioPor(
  leads: Lead[],
  chaveFn: (l: Lead) => string,
): { chave: string; media: number; amostras: number }[] {
  const mapa = new Map<string, number[]>();
  for (const lead of leads.filter(chegou)) {
    if (lead.ticketMedio === null) continue;
    const chave = chaveFn(lead);
    if (!mapa.has(chave)) mapa.set(chave, []);
    mapa.get(chave)!.push(lead.ticketMedio);
  }
  return Array.from(mapa.entries())
    .map(([chave, valores]) => ({
      chave,
      media: valores.reduce((s, v) => s + v, 0) / valores.length,
      amostras: valores.length,
    }))
    .sort((a, b) => b.media - a.media);
}

const ORDEM_SEMANA = ["Seg", "Ter", "Qua", "Qui", "Sex", "Sáb", "Dom"];

export function leadsPorDiaDaSemana(leads: Lead[]): ContagemItem[] {
  const contagem = new Map(ORDEM_SEMANA.map((d) => [d, 0]));
  for (const lead of leads.filter(chegou)) {
    if (!lead.dataContato) continue;
    const dia = weekdayShort(lead.dataContato);
    contagem.set(dia, (contagem.get(dia) ?? 0) + 1);
  }
  return ORDEM_SEMANA.map((chave) => ({ chave, total: contagem.get(chave) ?? 0 }));
}

// ---------- Evolução temporal ----------

export type Granularidade = "dia" | "semana" | "mes";

export function definirGranularidade(inicio: string, fim: string): Granularidade {
  const spanDias = daysBetween(inicio, fim) + 1;
  if (spanDias <= 45) return "dia";
  if (spanDias <= 180) return "semana";
  return "mes";
}

function inicioDaSemanaISO(iso: string): string {
  const [y, m, d] = iso.split("-").map(Number);
  const date = new Date(Date.UTC(y, m - 1, d));
  const diaSemana = date.getUTCDay(); // 0=dom
  const deslocamento = diaSemana === 0 ? -6 : 1 - diaSemana; // volta pra segunda
  date.setUTCDate(date.getUTCDate() + deslocamento);
  return date.toISOString().slice(0, 10);
}

function chaveBucket(iso: string, granularidade: Granularidade): string {
  if (granularidade === "dia") return iso;
  if (granularidade === "semana") return inicioDaSemanaISO(iso);
  return iso.slice(0, 7);
}

export function rotuloBucket(chave: string, granularidade: Granularidade): string {
  if (granularidade === "dia") return formatDayMonthShort(chave);
  if (granularidade === "semana") return formatDayMonth(chave);
  return formatMonthYear(`${chave}-01`);
}

export interface PontoEvolucao {
  chave: string;
  rotulo: string;
  total: number;
  qualificados: number;
  agendados: number;
  desistiu: number;
  taxaQualificacao: number | null;
  taxaAgendamento: number | null;
}

// Cada número cai no período em que aconteceu: chegada pela data de contato,
// qualificação, agendamento e desistência pela data em que o lead atingiu
// a etapa.
export function computeEvolucao(
  leads: Lead[],
  granularidade: Granularidade,
): PontoEvolucao[] {
  const mapa = new Map<string, { total: number; qualificados: number; agendados: number; desistiu: number }>();
  const somar = (data: string | null, campo: "total" | "qualificados" | "agendados" | "desistiu") => {
    if (!data) return;
    const chave = chaveBucket(data, granularidade);
    if (!mapa.has(chave)) mapa.set(chave, { total: 0, qualificados: 0, agendados: 0, desistiu: 0 });
    mapa.get(chave)![campo]++;
  };
  for (const lead of leads) {
    const m = marcosDoLead(lead);
    if (chegou(lead)) somar(lead.dataContato, "total");
    if (lead.qualificado) somar(m.qualificado, "qualificados");
    if (lead.status === "Agendado") somar(m.agendado, "agendados");
    if (lead.status === "Desistiu") somar(m.desistiu, "desistiu");
  }

  return Array.from(mapa.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([chave, c]) => ({
      chave,
      rotulo: rotuloBucket(chave, granularidade),
      ...c,
      taxaQualificacao: c.total ? (c.qualificados / c.total) * 100 : null,
      taxaAgendamento: c.qualificados ? (c.agendados / c.qualificados) * 100 : null,
    }));
}

// ---------- Performance por vendedor ----------

export interface PerformanceVendedor {
  vendedor: string;
  leads: number;
  qualificados: number;
  agendamentos: number;
  desistencias: number;
  taxaConversao: number | null; // agendamentos / qualificados
  taxaDesistencia: number | null; // desistencias / leads
  ticketMedio: number | null;
}

export function computePerformancePorVendedor(leads: Lead[]): PerformanceVendedor[] {
  const mapa = new Map<string, Lead[]>();
  for (const lead of leads) {
    if (!mapa.has(lead.vendedor)) mapa.set(lead.vendedor, []);
    mapa.get(lead.vendedor)!.push(lead);
  }

  return Array.from(mapa.entries())
    .map(([vendedor, grupo]) => {
      const qualificados = grupo.filter((l) => l.qualificado).length;
      const agendamentos = grupo.filter((l) => l.status === "Agendado").length;
      const desistencias = grupo.filter((l) => l.status === "Desistiu").length;
      const chegaram = grupo.filter(chegou).length;
      const comTicket = grupo.filter((l) => chegou(l) && l.ticketMedio !== null);
      return {
        vendedor,
        leads: chegaram,
        qualificados,
        agendamentos,
        desistencias,
        taxaConversao: qualificados ? (agendamentos / qualificados) * 100 : null,
        taxaDesistencia: chegaram ? (desistencias / chegaram) * 100 : null,
        ticketMedio: comTicket.length
          ? comTicket.reduce((s, l) => s + (l.ticketMedio ?? 0), 0) / comTicket.length
          : null,
      };
    })
    .sort((a, b) => b.leads - a.leads);
}

// ---------- Desistência ----------

export function taxaDesistenciaPor(
  leads: Lead[],
  chaveFn: (l: Lead) => string,
): { chave: string; taxa: number; total: number; desistencias: number }[] {
  const mapa = new Map<string, Lead[]>();
  for (const lead of leads) {
    const chave = chaveFn(lead);
    if (!mapa.has(chave)) mapa.set(chave, []);
    mapa.get(chave)!.push(lead);
  }
  return Array.from(mapa.entries())
    .map(([chave, grupo]) => {
      const desistencias = grupo.filter((l) => l.status === "Desistiu").length;
      const total = grupo.filter(chegou).length;
      return {
        chave,
        total,
        desistencias,
        taxa: total ? (desistencias / total) * 100 : 0,
      };
    })
    .sort((a, b) => b.taxa - a.taxa);
}

export interface DesistenciaPosQualificacao {
  qualificadosDesistiram: number;
  totalQualificados: number;
  taxa: number | null;
}

export function computeDesistenciaPosQualificacao(
  leads: Lead[],
): DesistenciaPosQualificacao {
  const qualificados = leads.filter((l) => l.qualificado);
  const desistiram = qualificados.filter((l) => l.status === "Desistiu").length;
  return {
    qualificadosDesistiram: desistiram,
    totalQualificados: qualificados.length,
    taxa: qualificados.length ? (desistiram / qualificados.length) * 100 : null,
  };
}

export interface MotivoDesistenciaItem {
  motivo: MotivoDesistencia | string;
  total: number;
  percentual: number;
}

export function computeMotivosDesistencia(leads: Lead[]): MotivoDesistenciaItem[] {
  const desistiram = leads.filter((l) => l.status === "Desistiu");
  const mapa = new Map<string, number>();
  for (const lead of desistiram) {
    // Lead do PipeFácil já traz o "Motivo da perda" escolhido pelo vendedor;
    // só os da planilha precisam ser categorizados a partir do texto livre.
    const motivo = lead.motivoPerda || categorizarMotivo(lead.observacoes);
    mapa.set(motivo, (mapa.get(motivo) ?? 0) + 1);
  }
  const total = desistiram.length;
  return Array.from(mapa.entries())
    .map(([motivo, count]) => ({
      motivo,
      total: count,
      percentual: total ? (count / total) * 100 : 0,
    }))
    .sort((a, b) => b.total - a.total);
}

// ---------- Criativos (anúncio de origem) ----------

export interface FunilOrigem {
  leads: number;
  qualificados: number;
  agendados: number;
  comparecidos: number;
  convertidos: number;
  taxaAgendamento: number | null; // agendados / leads
}

export interface ResultadoCriativo extends FunilOrigem {
  criativo: Criativo;
  primeiroLead: string | null;
  ultimoLead: string | null;
}

// Leads que chegaram sem um criativo identificado, separados pelo que se
// sabe da origem (ver classificarSemAnuncio em pipefacil.ts).
export type TipoSemCriativo =
  | "imagem_nao_identificada"
  | "anuncio_sem_clique"
  | "mensagem_indisponivel"
  | "mensagem_pronta"
  | "sem_rastro"
  | "planilha";

export interface LinhaSemCriativo extends FunilOrigem {
  tipo: TipoSemCriativo;
  mensagem?: string; // só em "mensagem_pronta"
}

export interface CriativosResumo {
  // No ar (ou de status desconhecido, quando a conta do Meta não está
  // configurada), um por linha.
  criativos: ResultadoCriativo[];
  // Fora do ar mas com leads: listados à parte e somados numa linha.
  pausados: ResultadoCriativo[];
  totalPausados: FunilOrigem;
  // Tudo somado — criativos, fora do ar e estas linhas — fecha com o funil
  // de conversão do painel.
  semCriativo: LinhaSemCriativo[];
  pendentes: number; // leads cuja origem ainda não foi lida no CRM
}

function funilVazio(): FunilOrigem {
  return { leads: 0, qualificados: 0, agendados: 0, comparecidos: 0, convertidos: 0, taxaAgendamento: null };
}

// Mesmas regras do funil de conversão (um lead que agendou e depois
// desistiu sai de Agendados).
function somarNoFunil(f: FunilOrigem, lead: Lead): void {
  if (chegou(lead)) f.leads++;
  if (lead.qualificado) f.qualificados++;
  if (lead.status === "Agendado") f.agendados++;
  if (lead.compareceu === "Sim") f.comparecidos++;
  if (lead.converteu === "Sim") f.convertidos++;
}

function comTaxa<T extends FunilOrigem>(f: T): T {
  return { ...f, taxaAgendamento: f.leads ? (f.agendados / f.leads) * 100 : null };
}

const ORDEM_SEM_CRIATIVO: TipoSemCriativo[] = [
  "imagem_nao_identificada",
  "anuncio_sem_clique",
  "mensagem_indisponivel",
  "mensagem_pronta",
  "sem_rastro",
  "planilha",
];

// Agrupa o funil pelo criativo que trouxe cada lead.
export function computeCriativos(
  leads: Lead[],
  criativos: Record<string, Criativo>,
): CriativosResumo {
  const mapa = new Map<string, ResultadoCriativo>();
  const semCriativo = new Map<string, LinhaSemCriativo>();
  const somarSemCriativo = (tipo: TipoSemCriativo, lead: Lead, mensagem?: string) => {
    const chave = mensagem ? `${tipo}:${mensagem}` : tipo;
    if (!semCriativo.has(chave)) semCriativo.set(chave, { ...funilVazio(), tipo, mensagem });
    somarNoFunil(semCriativo.get(chave)!, lead);
  };
  let pendentes = 0;
  for (const lead of leads) {
    if (lead.fonteDados === "planilha") {
      somarSemCriativo("planilha", lead);
      continue;
    }
    if (lead.anuncio === undefined) {
      if (chegou(lead)) pendentes++;
      continue;
    }
    const criativo = lead.anuncio ? criativos[lead.anuncio] : undefined;
    if (!criativo) {
      const s = lead.semAnuncio ?? { tipo: "sem_rastro" as const };
      somarSemCriativo(s.tipo, lead, s.mensagem);
      continue;
    }
    if (criativo.variacoes) {
      somarSemCriativo("imagem_nao_identificada", lead);
      continue;
    }
    if (!mapa.has(criativo.chave)) {
      mapa.set(criativo.chave, { ...funilVazio(), criativo, primeiroLead: null, ultimoLead: null });
    }
    const r = mapa.get(criativo.chave)!;
    somarNoFunil(r, lead);
    const d = lead.dataContato;
    if (chegou(lead) && d) {
      if (!r.primeiroLead || d < r.primeiroLead) r.primeiroLead = d;
      if (!r.ultimoLead || d > r.ultimoLead) r.ultimoLead = d;
    }
  }
  // Criativo no ar sem nenhum lead entra zerado, no fim da lista.
  for (const criativo of Object.values(criativos)) {
    if (criativo.ativo && !criativo.variacoes && !mapa.has(criativo.chave)) {
      mapa.set(criativo.chave, { ...funilVazio(), criativo, primeiroLead: null, ultimoLead: null });
    }
  }
  const lista = Array.from(mapa.values())
    .map(comTaxa)
    .sort(
      (a, b) =>
        b.convertidos - a.convertidos ||
        b.comparecidos - a.comparecidos ||
        b.agendados - a.agendados ||
        b.leads - a.leads,
    );
  const pausados = lista.filter((r) => r.criativo.ativo === false);
  const totalPausados = funilVazio();
  for (const r of pausados) {
    totalPausados.leads += r.leads;
    totalPausados.qualificados += r.qualificados;
    totalPausados.agendados += r.agendados;
    totalPausados.comparecidos += r.comparecidos;
    totalPausados.convertidos += r.convertidos;
  }
  return {
    criativos: lista.filter((r) => r.criativo.ativo !== false),
    pausados,
    totalPausados: comTaxa(totalPausados),
    semCriativo: Array.from(semCriativo.values())
      .map(comTaxa)
      .sort(
        (a, b) =>
          ORDEM_SEM_CRIATIVO.indexOf(a.tipo) - ORDEM_SEM_CRIATIVO.indexOf(b.tipo) || b.leads - a.leads,
      ),
    pendentes,
  };
}

// ---------- Faixa de datas disponível ----------

export function faixaDeDatasDisponivel(leads: Lead[]): Periodo | null {
  const datas = leads.map((l) => l.dataContato).filter(Boolean) as string[];
  if (!datas.length) return null;
  datas.sort();
  return { inicio: datas[0], fim: datas[datas.length - 1] };
}

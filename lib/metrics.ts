import type { Lead, StatusLead } from "./types";
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

export function filtrarLeads(leads: Lead[], filtros: Filtros): Lead[] {
  return leads.filter((lead) => {
    if (filtros.periodo) {
      if (!lead.dataContato) return false;
      if (lead.dataContato < filtros.periodo.inicio) return false;
      if (lead.dataContato > filtros.periodo.fim) return false;
    }
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
  const totalLeads = leads.length;
  const qualificados = leads.filter((l) => l.qualificado).length;
  const agendamentos = leads.filter((l) => l.status === "Agendado").length;
  const emAvaliacao = leads.filter((l) => l.status === "Avaliando").length;
  const desistiu = leads.filter((l) => l.status === "Desistiu").length;

  const comTicket = leads.filter((l) => l.ticketMedio !== null);
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
  const total = leads.length;
  const qualificados = leads.filter((l) => l.qualificado).length;
  const agendados = leads.filter((l) => l.status === "Agendado").length;

  const pct = (v: number) => (total ? (v / total) * 100 : 0);

  return [
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
  for (const lead of leads) {
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
  for (const lead of leads) {
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
  for (const lead of leads) {
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

export function computeEvolucao(
  leads: Lead[],
  granularidade: Granularidade,
): PontoEvolucao[] {
  const comData = leads.filter((l) => l.dataContato);
  const mapa = new Map<string, Lead[]>();
  for (const lead of comData) {
    const chave = chaveBucket(lead.dataContato!, granularidade);
    if (!mapa.has(chave)) mapa.set(chave, []);
    mapa.get(chave)!.push(lead);
  }

  return Array.from(mapa.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([chave, grupo]) => {
      const total = grupo.length;
      const qualificados = grupo.filter((l) => l.qualificado).length;
      const agendados = grupo.filter((l) => l.status === "Agendado").length;
      const desistiu = grupo.filter((l) => l.status === "Desistiu").length;
      return {
        chave,
        rotulo: rotuloBucket(chave, granularidade),
        total,
        qualificados,
        agendados,
        desistiu,
        taxaQualificacao: total ? (qualificados / total) * 100 : null,
        taxaAgendamento: qualificados ? (agendados / qualificados) * 100 : null,
      };
    });
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
      const comTicket = grupo.filter((l) => l.ticketMedio !== null);
      return {
        vendedor,
        leads: grupo.length,
        qualificados,
        agendamentos,
        desistencias,
        taxaConversao: qualificados ? (agendamentos / qualificados) * 100 : null,
        taxaDesistencia: grupo.length ? (desistencias / grupo.length) * 100 : null,
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
      return {
        chave,
        total: grupo.length,
        desistencias,
        taxa: grupo.length ? (desistencias / grupo.length) * 100 : 0,
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
  motivo: MotivoDesistencia;
  total: number;
  percentual: number;
}

export function computeMotivosDesistencia(leads: Lead[]): MotivoDesistenciaItem[] {
  const desistiram = leads.filter((l) => l.status === "Desistiu");
  const mapa = new Map<MotivoDesistencia, number>();
  for (const lead of desistiram) {
    const motivo = categorizarMotivo(lead.observacoes);
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

// ---------- Faixa de datas disponível ----------

export function faixaDeDatasDisponivel(leads: Lead[]): Periodo | null {
  const datas = leads.map((l) => l.dataContato).filter(Boolean) as string[];
  if (!datas.length) return null;
  datas.sort();
  return { inicio: datas[0], fim: datas[datas.length - 1] };
}

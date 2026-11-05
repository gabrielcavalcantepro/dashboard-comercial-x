// Planilha de acompanhamento: pacientes que compareceram, com o valor pago
// por cada um. É a fonte do ticket médio e da receita projetada dos
// clientes que a têm (no lugar do valor estimado dos leads).

import { buscarValoresPlanilha, normalizarCabecalho, parseDataBR, parseTicket } from "./sheets";
import type { Comparecimento } from "./types";

// Sem nome de aba, o intervalo se refere à primeira aba da planilha.
const INTERVALO = "A:Z";

const COLUNAS = {
  data: ["data", "data do comparecimento", "data da consulta"],
  paciente: ["nome do paciente", "paciente", "nome"],
  procedimento: ["procedimento"],
  valor: ["valor do procedimento", "valor pago", "valor"],
};

export type ResultadoComparecimentos =
  | { ok: true; comparecimentos: Comparecimento[] }
  | { ok: false; mensagem: string };

export async function lerPlanilhaDeComparecimentos(sheetId: string): Promise<ResultadoComparecimentos> {
  const res = await buscarValoresPlanilha(sheetId, INTERVALO);
  if (!res.ok) return { ok: false, mensagem: res.mensagem };

  const cabecalho = res.cabecalho.map((c) => normalizarCabecalho(String(c ?? "")));
  const indice = (nomes: string[]) => cabecalho.findIndex((c) => nomes.includes(c));
  const i = {
    data: indice(COLUNAS.data),
    paciente: indice(COLUNAS.paciente),
    procedimento: indice(COLUNAS.procedimento),
    valor: indice(COLUNAS.valor),
  };
  if (i.data < 0 || i.valor < 0) {
    return {
      ok: false,
      mensagem:
        'A planilha de acompanhamento precisa das colunas "Data" e "Valor do procedimento" na primeira linha da primeira aba.',
    };
  }

  const celula = (linha: string[], col: number) => (col < 0 ? "" : String(linha[col] ?? "").trim());
  const comparecimentos: Comparecimento[] = [];
  for (const linha of res.linhas) {
    const data = parseDataBR(celula(linha, i.data));
    const valor = parseTicket(celula(linha, i.valor));
    // Linha sem data ou sem valor ainda não foi preenchida.
    if (!data || valor === null) continue;
    comparecimentos.push({
      data,
      paciente: celula(linha, i.paciente),
      procedimento: celula(linha, i.procedimento),
      valor,
    });
  }
  return { ok: true, comparecimentos };
}

export async function carregarComparecimentos(
  planilhaComparecimentosId: string | null,
): Promise<ResultadoComparecimentos | null> {
  if (!planilhaComparecimentosId) return null;
  return lerPlanilhaDeComparecimentos(planilhaComparecimentosId);
}

// Planilha de pacientes que compareceram, com o valor pago por cada um.
// É a fonte do ticket médio e da receita projetada dos clientes que a têm
// (no lugar do valor estimado dos leads).

import { buscarValoresPlanilha, normalizarCabecalho, parseDataBR, parseTicket } from "./sheets";
import type { Comparecimento } from "./types";

// Por enquanto só o Dr. Hélio usa a planilha de comparecimentos.
const PLANILHAS: Record<string, { sheetId: string; aba: string }> = {
  "179d1d40-0d87-4841-a53a-805e40d48ace": {
    sheetId: "1wZNMzeaQwAO6WrqzPSw3HvOn5PjQYD-cFFbC6YgyOo8",
    aba: "Página1",
  },
};

const COLUNAS = {
  data: ["data"],
  paciente: ["nome do paciente", "paciente", "nome"],
  procedimento: ["procedimento"],
  valor: ["valor do procedimento", "valor pago", "valor"],
};

export type ResultadoComparecimentos =
  | { ok: true; comparecimentos: Comparecimento[] }
  | { ok: false; mensagem: string };

export async function carregarComparecimentos(clienteId: string): Promise<ResultadoComparecimentos | null> {
  const planilha = PLANILHAS[clienteId];
  if (!planilha) return null;
  const res = await buscarValoresPlanilha(planilha.sheetId, planilha.aba);
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
      mensagem: 'A planilha de comparecimentos precisa das colunas "Data" e "Valor do procedimento".',
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

export type MotivoDesistencia =
  | "Não respondeu"
  | "Sumiu após valor"
  | "Preço / orçamento"
  | "Sem interesse"
  | "Remarcação / indisponibilidade"
  | "Outros"
  | "Sem observação";

interface RegraMotivo {
  motivo: MotivoDesistencia;
  palavrasChave: string[];
}

// Ordem importa: a primeira regra cujo termo aparece no texto vence.
const REGRAS: RegraMotivo[] = [
  {
    motivo: "Sumiu após valor",
    palavrasChave: [
      "sumiu apos valor",
      "sumiu depois do valor",
      "sumiu apos passar valor",
      "sumiu quando passou valor",
      "sumiu com o valor",
      "sumiu apos o orcamento",
      "sumiu depois de saber o valor",
    ],
  },
  {
    motivo: "Não respondeu",
    palavrasChave: [
      "nao respondeu",
      "sem resposta",
      "nao retornou",
      "nao atendeu",
      "nao viu",
      "nao visualizou",
      "visualizou e nao respondeu",
      "silencio",
      "sumiu sem",
      "ignorou",
    ],
  },
  {
    motivo: "Preço / orçamento",
    palavrasChave: [
      "caro",
      "valor alto",
      "achou o valor",
      "sem condi",
      "nao tinha dinheiro",
      "fora do orcamento",
      "orcamento",
      "nao tem verba",
      "preco",
    ],
  },
  {
    motivo: "Remarcação / indisponibilidade",
    palavrasChave: [
      "remarcar",
      "remarcou",
      "nao pode comparecer",
      "sem horario",
      "sem disponibilidade",
      "viagem",
      "sem tempo",
    ],
  },
  {
    motivo: "Sem interesse",
    palavrasChave: [
      "desistiu",
      "nao quis",
      "nao tem interesse",
      "sem interesse",
      "mudou de ideia",
      "cancelou",
      "nao quer mais",
    ],
  },
];

function normalizar(texto: string): string {
  return texto
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .trim();
}

export function categorizarMotivo(observacao: string): MotivoDesistencia {
  const texto = normalizar(observacao || "");
  if (!texto) return "Sem observação";
  for (const regra of REGRAS) {
    if (regra.palavrasChave.some((p) => texto.includes(p))) {
      return regra.motivo;
    }
  }
  return "Outros";
}

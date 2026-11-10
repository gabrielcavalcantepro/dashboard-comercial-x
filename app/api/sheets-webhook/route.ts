import { NextResponse } from "next/server";
import { buscarClientePorPlanilhaComparecimentos } from "@/lib/db";
import { atualizarNegocio, buscarFunil, buscarNegociosPorBusca } from "@/lib/pipefacil";

export async function GET() {
  return NextResponse.json({ secret: process.env.SHEETS_WEBHOOK_SECRET ?? "" });
}

const PROCEDIMENTOS_FIELD = "51f49ba9-9d71-4acf-922a-7a9f8f83c5af";

function normalizar(texto: string) {
  return texto
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .trim();
}

const NOMES_COMPARECEU = ["compareceu", "comparecidos", "comparecido"];
const NOMES_CONVERTIDO = ["convertidos", "convertido"];
const NOMES_AGENDADO = ["agendados", "agendado"];

function parseValor(texto: string): number {
  return parseFloat((texto ?? "0").replace(/[^\d,]/g, "").replace(",", ".")) || 0;
}

export async function POST(req: Request) {
  const secret = process.env.SHEETS_WEBHOOK_SECRET;
  if (!secret) {
    return NextResponse.json({ erro: "SHEETS_WEBHOOK_SECRET não configurado no servidor." }, { status: 500 });
  }
  if (req.headers.get("Authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ erro: "Não autorizado." }, { status: 401 });
  }

  let body: { sheetId?: string; phone?: string; procedimento?: string; valor?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ erro: "JSON inválido." }, { status: 400 });
  }

  const { sheetId, phone, procedimento, valor } = body;
  if (!sheetId || !phone) {
    return NextResponse.json({ erro: "sheetId e phone são obrigatórios." }, { status: 400 });
  }

  const cliente = await buscarClientePorPlanilhaComparecimentos(sheetId);
  if (!cliente) {
    return NextResponse.json({ erro: "Nenhum cliente configurado com essa planilha." }, { status: 404 });
  }
  if (!cliente.pipefacilPipelineSeq) {
    return NextResponse.json(
      { erro: `Cliente "${cliente.nome}" não tem funil do PipeFácil configurado.` },
      { status: 422 },
    );
  }

  const apiKey = process.env.PIPEFACIL_API_KEY ?? "";
  const funilRes = await buscarFunil(apiKey, cliente.pipefacilPipelineSeq);
  if (!funilRes.ok) {
    return NextResponse.json({ erro: `PipeFácil: ${funilRes.mensagem}` }, { status: 502 });
  }

  const temProcedimento = !!(procedimento?.trim());
  const temValor = !!(valor?.trim());
  const moverParaConvertido = temProcedimento && temValor;

  const etapaCompareceu = funilRes.dados.stages.find((s) => NOMES_COMPARECEU.includes(normalizar(s.name)));
  if (!etapaCompareceu) {
    return NextResponse.json(
      { erro: `Funil "${funilRes.dados.name}" não tem etapa "Compareceu". Renomeie uma etapa para "Compareceu" ou "Comparecidos".` },
      { status: 422 },
    );
  }

  const etapaConvertido = funilRes.dados.stages.find((s) => NOMES_CONVERTIDO.includes(normalizar(s.name)));
  const etapaAlvo = moverParaConvertido && etapaConvertido ? etapaConvertido : etapaCompareceu;

  const digits = phone.replace(/\D/g, "");
  const searchTerm = digits.slice(-8);

  const negociosRes = await buscarNegociosPorBusca(apiKey, cliente.pipefacilPipelineSeq, searchTerm);
  if (!negociosRes.ok) {
    return NextResponse.json({ erro: `PipeFácil: ${negociosRes.mensagem}` }, { status: 502 });
  }

  if (!negociosRes.dados.length) {
    return NextResponse.json(
      { status: "not_found", searchTerm, pipeline: funilRes.dados.name, cliente: cliente.nome },
      { status: 404 },
    );
  }

  const agendadoIds = new Set(
    funilRes.dados.stages.filter((s) => NOMES_AGENDADO.includes(normalizar(s.name))).map((s) => s.id),
  );
  const negocio =
    negociosRes.dados.find((n) => agendadoIds.has(n.stageId)) ?? negociosRes.dados[0];

  const valorNumerico = parseValor(valor ?? "0");
  const procedimentosText =
    temProcedimento && valorNumerico > 0
      ? `${procedimento!.trim()} — R$ ${valorNumerico.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`
      : temProcedimento
        ? procedimento!.trim()
        : undefined;

  const atualizacaoRes = await atualizarNegocio(apiKey, negocio.seq, {
    stageId: etapaAlvo.id,
    ...(valorNumerico > 0 ? { value: valorNumerico } : {}),
    ...(procedimentosText ? { customFields: { [PROCEDIMENTOS_FIELD]: procedimentosText } } : {}),
  });

  if (!atualizacaoRes.ok) {
    return NextResponse.json({ erro: `PipeFácil: ${atualizacaoRes.mensagem}` }, { status: 502 });
  }

  return NextResponse.json({
    status: "ok",
    negocioSeq: negocio.seq,
    negocioNome: negocio.name,
    etapa: etapaAlvo.name,
    procedimento: procedimentosText ?? null,
    valor: valorNumerico,
    pipeline: funilRes.dados.name,
    cliente: cliente.nome,
  });
}

import { NextResponse } from "next/server";
import { atualizarCliente, buscarCliente, paraClientePublico, removerCliente } from "@/lib/db";
import { buscarFunil } from "@/lib/pipefacil";
import { buscarValoresPlanilha, extrairSheetId, validarCabecalho } from "@/lib/sheets";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const cliente = await buscarCliente(id);
  if (!cliente) {
    return NextResponse.json({ erro: "Cliente não encontrado." }, { status: 404 });
  }
  return NextResponse.json({ cliente: paraClientePublico(cliente) });
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const cliente = await buscarCliente(id);
  if (!cliente) {
    return NextResponse.json({ erro: "Cliente não encontrado." }, { status: 404 });
  }

  let body: {
    nome?: string;
    segmento?: string;
    linkPlanilha?: string;
    pipefacilPipelineSeq?: number | null;
    metaAdAccountId?: string;
    metaAccessToken?: string;
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      { erro: "Não foi possível ler os dados enviados." },
      { status: 400 },
    );
  }

  const nome = (body.nome ?? "").trim();
  const segmento = (body.segmento ?? "").trim();
  const linkPlanilha = (body.linkPlanilha ?? "").trim();
  const metaAdAccountId = (body.metaAdAccountId ?? "").trim();
  const metaAccessToken = (body.metaAccessToken ?? "").trim();

  if (!nome) {
    return NextResponse.json({ erro: "Informe o nome do cliente." }, { status: 400 });
  }
  if (!segmento) {
    return NextResponse.json({ erro: "Informe o segmento do cliente." }, { status: 400 });
  }

  const pipefacilPipelineSeq = Number(body.pipefacilPipelineSeq) || null;
  if (!linkPlanilha && pipefacilPipelineSeq === null) {
    return NextResponse.json(
      { erro: "Escolha um funil do PipeFácil ou informe o link da planilha." },
      { status: 400 },
    );
  }

  // A planilha é opcional quando o cliente já tem funil no PipeFácil.
  const sheetId = linkPlanilha ? extrairSheetId(linkPlanilha) : null;
  if (linkPlanilha && !sheetId) {
    return NextResponse.json(
      { erro: "Não conseguimos identificar o ID da planilha nesse link. Cole o link completo do Google Sheets." },
      { status: 400 },
    );
  }

  // Só reconsulta o PipeFácil e o Google Sheets se o funil ou a planilha
  // mudaram — trocar apenas nome/segmento não deveria depender dessas APIs
  // estarem disponíveis.
  if (pipefacilPipelineSeq !== null && pipefacilPipelineSeq !== cliente.pipefacilPipelineSeq) {
    const funil = await buscarFunil(process.env.PIPEFACIL_API_KEY ?? "", pipefacilPipelineSeq);
    if (!funil.ok) {
      return NextResponse.json({ erro: funil.mensagem }, { status: 422 });
    }
  }

  if (sheetId && sheetId !== cliente.sheetId) {
    const resultado = await buscarValoresPlanilha(sheetId, cliente.abaNome);
    if (!resultado.ok) {
      return NextResponse.json({ erro: resultado.mensagem }, { status: 422 });
    }
    const validacao = validarCabecalho(resultado.cabecalho);
    if (!validacao.ok) {
      return NextResponse.json({ erro: validacao.mensagem }, { status: 422 });
    }
  }

  const atualizado = await atualizarCliente(id, {
    nome,
    segmento,
    sheetId,
    pipefacilPipelineSeq,
    metaAdAccountId,
    metaAccessToken,
  });
  return NextResponse.json({ cliente: atualizado ? paraClientePublico(atualizado) : null });
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  await removerCliente(id);
  return NextResponse.json({ ok: true });
}

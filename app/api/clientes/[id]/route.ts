import { NextResponse } from "next/server";
import { atualizarCliente, buscarCliente, removerCliente } from "@/lib/db";
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
  return NextResponse.json({ cliente });
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

  let body: { nome?: string; segmento?: string; linkPlanilha?: string };
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

  if (!nome) {
    return NextResponse.json({ erro: "Informe o nome do cliente." }, { status: 400 });
  }
  if (!segmento) {
    return NextResponse.json({ erro: "Informe o segmento do cliente." }, { status: 400 });
  }

  const sheetId = extrairSheetId(linkPlanilha);
  if (!sheetId) {
    return NextResponse.json(
      { erro: "Não conseguimos identificar o ID da planilha nesse link. Cole o link completo do Google Sheets." },
      { status: 400 },
    );
  }

  // Só reconsulta o Google Sheets se a planilha em si mudou — trocar
  // apenas nome/segmento não deveria depender da API estar disponível.
  if (sheetId !== cliente.sheetId) {
    const resultado = await buscarValoresPlanilha(sheetId, cliente.abaNome);
    if (!resultado.ok) {
      return NextResponse.json({ erro: resultado.mensagem }, { status: 422 });
    }
    const validacao = validarCabecalho(resultado.cabecalho);
    if (!validacao.ok) {
      return NextResponse.json({ erro: validacao.mensagem }, { status: 422 });
    }
  }

  const atualizado = await atualizarCliente(id, { nome, segmento, sheetId });
  return NextResponse.json({ cliente: atualizado });
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  await removerCliente(id);
  return NextResponse.json({ ok: true });
}

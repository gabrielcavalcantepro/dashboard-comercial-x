import { NextResponse } from "next/server";
import { criarCliente, listarClientes } from "@/lib/db";
import { buscarValoresPlanilha, extrairSheetId, validarCabecalho } from "@/lib/sheets";
import type { NovoClienteInput } from "@/lib/types";

export async function GET() {
  const clientes = await listarClientes();
  return NextResponse.json({ clientes });
}

export async function POST(req: Request) {
  let body: NovoClienteInput;
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
  const abaNome = (body.abaNome ?? "Leads").trim() || "Leads";

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

  const resultado = await buscarValoresPlanilha(sheetId, abaNome);
  if (!resultado.ok) {
    return NextResponse.json({ erro: resultado.mensagem }, { status: 422 });
  }

  const validacao = validarCabecalho(resultado.cabecalho);
  if (!validacao.ok) {
    return NextResponse.json({ erro: validacao.mensagem }, { status: 422 });
  }

  const cliente = await criarCliente({ nome, segmento, linkPlanilha, abaNome, sheetId });
  return NextResponse.json({ cliente }, { status: 201 });
}

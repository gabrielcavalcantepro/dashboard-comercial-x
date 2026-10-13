import { NextResponse } from "next/server";
import { listarFunis } from "@/lib/pipefacil";

export const dynamic = "force-dynamic";

// Funis do workspace do PipeFácil, para o seletor do cadastro de cliente.
export async function GET() {
  const resultado = await listarFunis(process.env.PIPEFACIL_API_KEY ?? "");
  if (!resultado.ok) {
    return NextResponse.json({ erro: resultado.mensagem }, { status: 502 });
  }
  return NextResponse.json({
    funis: resultado.dados.map((f) => ({ seq: f.seq, nome: f.name })),
  });
}

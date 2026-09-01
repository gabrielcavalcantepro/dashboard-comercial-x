import { NextResponse } from "next/server";
import { buscarCliente } from "@/lib/db";
import { buscarValoresPlanilha, parseLinhas, validarCabecalho } from "@/lib/sheets";
import type { Lead } from "@/lib/types";

const TTL_MS = 15_000;

interface CacheEntry {
  timestamp: number;
  leads: Lead[];
  statusNaoReconhecido: number;
  avisosColunas: string[];
}

declare global {
  var __leadsCache: Map<string, CacheEntry> | undefined;
}

function getCache(): Map<string, CacheEntry> {
  if (!global.__leadsCache) global.__leadsCache = new Map();
  return global.__leadsCache;
}

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const cliente = await buscarCliente(id);
  if (!cliente) {
    return NextResponse.json({ erro: "Cliente não encontrado." }, { status: 404 });
  }

  const cache = getCache();
  const cacheado = cache.get(id);
  if (cacheado && Date.now() - cacheado.timestamp < TTL_MS) {
    return NextResponse.json({
      leads: cacheado.leads,
      statusNaoReconhecido: cacheado.statusNaoReconhecido,
      avisosColunas: cacheado.avisosColunas,
      atualizadoEm: cacheado.timestamp,
    });
  }

  const resultado = await buscarValoresPlanilha(cliente.sheetId, cliente.abaNome);
  if (!resultado.ok) {
    if (cacheado) {
      return NextResponse.json({
        leads: cacheado.leads,
        statusNaoReconhecido: cacheado.statusNaoReconhecido,
        avisosColunas: cacheado.avisosColunas,
        atualizadoEm: cacheado.timestamp,
        avisoAtualizacao: resultado.mensagem,
      });
    }
    return NextResponse.json({ erro: resultado.mensagem }, { status: 502 });
  }

  const validacao = validarCabecalho(resultado.cabecalho);
  const { leads, statusNaoReconhecido } = parseLinhas(resultado.cabecalho, resultado.linhas);

  const avisosColunas = validacao.camposOpcionaisFaltando.length
    ? [
        `Colunas não encontradas nessa aba (gráficos relacionados ficam ocultos): ${validacao.camposOpcionaisFaltando
          .map((c) => c)
          .join(", ")}.`,
      ]
    : [];

  const entry: CacheEntry = {
    timestamp: Date.now(),
    leads,
    statusNaoReconhecido,
    avisosColunas,
  };
  cache.set(id, entry);

  return NextResponse.json({
    leads,
    statusNaoReconhecido,
    avisosColunas,
    atualizadoEm: entry.timestamp,
  });
}

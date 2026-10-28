import { NextResponse } from "next/server";
import { buscarCliente } from "@/lib/db";
import { buscarDadosAds } from "@/lib/meta-ads";
import type { AdsData } from "@/lib/meta-types";
import { addDaysISO, hojeISO } from "@/lib/format";

// TTL mais longo que o dos leads: métricas de anúncio não mudam a cada
// segundo, e cada atualização aqui dispara várias chamadas à API do Meta
// (agregado atual + anterior + diário + campanhas + criativos + vídeos +
// permalinks do Instagram) — um TTL curto estouraria o limite de requisições.
const TTL_MS = 5 * 60_000;

interface CacheEntry {
  timestamp: number;
  chave: string;
  dados: Omit<AdsData, "configurado" | "atualizadoEm" | "avisoAtualizacao">;
}

declare global {
  var __adsCache: Map<string, CacheEntry> | undefined;
}

function getCache(): Map<string, CacheEntry> {
  if (!global.__adsCache) global.__adsCache = new Map();
  return global.__adsCache;
}


export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const cliente = await buscarCliente(id);
  if (!cliente) {
    return NextResponse.json({ erro: "Cliente não encontrado." }, { status: 404 });
  }

  if (!cliente.metaAdAccountId || !cliente.metaAccessToken) {
    return NextResponse.json({ configurado: false });
  }

  const { searchParams } = new URL(req.url);
  const hoje = hojeISO();
  const inicio = searchParams.get("inicio") || addDaysISO(hoje, -29);
  const fim = searchParams.get("fim") || hoje;
  const periodo = { inicio, fim };
  const chave = `${id}:${inicio}:${fim}`;

  const cache = getCache();
  const cacheado = cache.get(id);
  if (cacheado && cacheado.chave === chave && Date.now() - cacheado.timestamp < TTL_MS) {
    return NextResponse.json({
      configurado: true,
      ...cacheado.dados,
      atualizadoEm: cacheado.timestamp,
    });
  }

  const resultado = await buscarDadosAds(cliente.metaAccessToken, cliente.metaAdAccountId, periodo);

  if (!resultado.ok) {
    if (cacheado) {
      return NextResponse.json({
        configurado: true,
        ...cacheado.dados,
        atualizadoEm: cacheado.timestamp,
        avisoAtualizacao: resultado.mensagem,
      });
    }
    return NextResponse.json({ erro: resultado.mensagem }, { status: 502 });
  }

  const entry: CacheEntry = { timestamp: Date.now(), chave, dados: resultado.data };
  cache.set(id, entry);

  return NextResponse.json({
    configurado: true,
    ...resultado.data,
    atualizadoEm: entry.timestamp,
  });
}

import { NextResponse } from "next/server";
import { buscarCliente } from "@/lib/db";
import { buscarLeadsDoFunil } from "@/lib/pipefacil";
import { buscarValoresPlanilha, parseLinhas, validarCabecalho } from "@/lib/sheets";
import type { Cliente, Lead } from "@/lib/types";

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

type Carga =
  | { ok: true; leads: Lead[]; statusNaoReconhecido: number; avisosColunas: string[] }
  | { ok: false; mensagem: string };

async function carregarDaPlanilha(sheetId: string, abaNome: string): Promise<Carga> {
  const resultado = await buscarValoresPlanilha(sheetId, abaNome);
  if (!resultado.ok) return { ok: false, mensagem: resultado.mensagem };

  const validacao = validarCabecalho(resultado.cabecalho);
  const { leads, statusNaoReconhecido } = parseLinhas(resultado.cabecalho, resultado.linhas);

  const avisosColunas = validacao.camposOpcionaisFaltando.length
    ? [
        `Colunas não encontradas nessa aba (gráficos relacionados ficam ocultos): ${validacao.camposOpcionaisFaltando
          .map((c) => c)
          .join(", ")}.`,
      ]
    : [];

  return { ok: true, leads, statusNaoReconhecido, avisosColunas };
}

async function carregarLeads(cliente: Cliente): Promise<Carga> {
  if (cliente.pipefacilPipelineSeq === null) {
    if (!cliente.sheetId) {
      return { ok: false, mensagem: "Este cliente não tem planilha nem funil do PipeFácil conectado." };
    }
    return carregarDaPlanilha(cliente.sheetId, cliente.abaNome);
  }

  const [crm, planilha] = await Promise.all([
    buscarLeadsDoFunil(cliente.pipefacilPipelineSeq),
    cliente.sheetId ? carregarDaPlanilha(cliente.sheetId, cliente.abaNome) : null,
  ]);
  if (!crm.ok) return { ok: false, mensagem: crm.mensagem };
  if (!planilha) {
    return { ok: true, leads: crm.leads, statusNaoReconhecido: 0, avisosColunas: crm.avisos };
  }
  if (!planilha.ok) {
    return {
      ok: true,
      leads: crm.leads,
      statusNaoReconhecido: 0,
      avisosColunas: [
        ...crm.avisos,
        `O histórico da planilha não pôde ser carregado, então o painel mostra só os leads do PipeFácil. ${planilha.mensagem}`,
      ],
    };
  }

  // A planilha é o histórico de antes da migração para o CRM e não é mais
  // preenchida, então as duas fontes são simplesmente somadas. Se a equipe
  // voltar a registrar o mesmo lead nos dois lugares, ele conta duas vezes.
  return {
    ok: true,
    leads: [...planilha.leads, ...crm.leads],
    statusNaoReconhecido: planilha.statusNaoReconhecido,
    avisosColunas: [...planilha.avisosColunas, ...crm.avisos],
  };
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

  const resultado = await carregarLeads(cliente);
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

  const entry: CacheEntry = {
    timestamp: Date.now(),
    leads: resultado.leads,
    statusNaoReconhecido: resultado.statusNaoReconhecido,
    avisosColunas: resultado.avisosColunas,
  };
  cache.set(id, entry);

  return NextResponse.json({
    leads: entry.leads,
    statusNaoReconhecido: entry.statusNaoReconhecido,
    avisosColunas: entry.avisosColunas,
    atualizadoEm: entry.timestamp,
  });
}

import { NextResponse } from "next/server";
import { buscarCliente, listarClientes } from "@/lib/db";
import { buscarLeadsDoFunil } from "@/lib/pipefacil";
import { buscarValoresPlanilha, parseLinhas, validarCabecalho } from "@/lib/sheets";
import { carregarComparecimentos } from "@/lib/comparecimentos";
import type { Comparecimento, Criativo, Cliente, Lead } from "@/lib/types";

const TTL_MS = 15_000;

interface CacheEntry {
  timestamp: number;
  leads: Lead[];
  anuncios: Record<string, Criativo>;
  comparecimentos: Comparecimento[] | null;
  statusNaoReconhecido: number;
  avisosColunas: string[];
}

declare global {
  var __leadsCache: Map<string, CacheEntry> | undefined;
  var __leadsEmAndamento: Map<string, ReturnType<typeof carregarTudo>> | undefined;
}

function getCache(): Map<string, CacheEntry> {
  if (!global.__leadsCache) global.__leadsCache = new Map();
  return global.__leadsCache;
}

type Carga =
  | {
      ok: true;
      leads: Lead[];
      anuncios: Record<string, Criativo>;
      statusNaoReconhecido: number;
      avisosColunas: string[];
    }
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

  return { ok: true, leads, anuncios: {}, statusNaoReconhecido, avisosColunas };
}

async function carregarLeads(cliente: Cliente): Promise<Carga> {
  if (cliente.pipefacilPipelineSeq === null) {
    if (!cliente.sheetId) {
      return { ok: false, mensagem: "Este cliente não tem planilha nem funil do PipeFácil conectado." };
    }
    return carregarDaPlanilha(cliente.sheetId, cliente.abaNome);
  }

  // Contas do Meta dos outros clientes: reconhecem o lead que chegou pelo
  // anúncio de outro cliente e foi movido para este funil.
  const outrasContas = (await listarClientes().catch(() => []))
    .filter((c) => c.id !== cliente.id && c.metaAdAccountId && c.metaAccessToken)
    .filter((c) => c.metaAdAccountId !== cliente.metaAdAccountId)
    .map((c) => ({ nome: c.nome, conta: { adAccountId: c.metaAdAccountId!, token: c.metaAccessToken! } }));

  const [crm, planilha] = await Promise.all([
    buscarLeadsDoFunil(
      cliente.pipefacilPipelineSeq,
      cliente.metaAdAccountId && cliente.metaAccessToken
        ? { adAccountId: cliente.metaAdAccountId, token: cliente.metaAccessToken }
        : undefined,
      outrasContas,
    ),
    cliente.sheetId ? carregarDaPlanilha(cliente.sheetId, cliente.abaNome) : null,
  ]);
  if (!crm.ok) return { ok: false, mensagem: crm.mensagem };
  if (!planilha) {
    return {
      ok: true,
      leads: crm.leads,
      anuncios: crm.anuncios,
      statusNaoReconhecido: 0,
      avisosColunas: crm.avisos,
    };
  }
  if (!planilha.ok) {
    return {
      ok: true,
      leads: crm.leads,
      anuncios: crm.anuncios,
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
    anuncios: crm.anuncios,
    statusNaoReconhecido: planilha.statusNaoReconhecido,
    avisosColunas: [...planilha.avisosColunas, ...crm.avisos],
  };
}

// A lista de clientes e o painel pedem o mesmo cliente ao mesmo tempo; uma
// leitura em andamento é compartilhada para não repetir as chamadas ao CRM
// (e o enriquecimento dos leads, que custa uma chamada por lead).
// A planilha de comparecimentos (ticket médio e receita projetada) é lida
// junto com os leads.
async function carregarTudo(
  cliente: Cliente,
): Promise<{ carga: Carga; comparecimentos: Comparecimento[] | null; avisoComparecimentos: string | null }> {
  const [carga, comparecimentos] = await Promise.all([carregarLeads(cliente), carregarComparecimentos(cliente.id)]);
  return {
    carga,
    comparecimentos: comparecimentos?.ok ? comparecimentos.comparecimentos : null,
    avisoComparecimentos:
      comparecimentos && !comparecimentos.ok
        ? `A planilha de comparecimentos não pôde ser lida, então ticket médio e receita projetada usam o valor dos leads. ${comparecimentos.mensagem}`
        : null,
  };
}

function carregarSemRepetir(cliente: Cliente): ReturnType<typeof carregarTudo> {
  if (!global.__leadsEmAndamento) global.__leadsEmAndamento = new Map();
  const emAndamento = global.__leadsEmAndamento;
  const existente = emAndamento.get(cliente.id);
  if (existente) return existente;
  const promessa = carregarTudo(cliente).finally(() => emAndamento.delete(cliente.id));
  emAndamento.set(cliente.id, promessa);
  return promessa;
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
      anuncios: cacheado.anuncios,
      comparecimentos: cacheado.comparecimentos,
      statusNaoReconhecido: cacheado.statusNaoReconhecido,
      avisosColunas: cacheado.avisosColunas,
      atualizadoEm: cacheado.timestamp,
    });
  }

  const { carga: resultado, comparecimentos, avisoComparecimentos } = await carregarSemRepetir(cliente);
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
    anuncios: resultado.anuncios,
    comparecimentos,
    statusNaoReconhecido: resultado.statusNaoReconhecido,
    avisosColunas: avisoComparecimentos
      ? [...resultado.avisosColunas, avisoComparecimentos]
      : resultado.avisosColunas,
  };
  cache.set(id, entry);

  return NextResponse.json({
    leads: entry.leads,
    anuncios: entry.anuncios,
    comparecimentos: entry.comparecimentos,
    statusNaoReconhecido: entry.statusNaoReconhecido,
    avisosColunas: entry.avisosColunas,
    atualizadoEm: entry.timestamp,
  });
}

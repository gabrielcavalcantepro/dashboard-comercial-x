import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { EnriquecimentoNegocio } from "./pipefacil";
import type { Cliente, ClientePublico, NovoClienteInput } from "./types";

declare global {
  var __supabaseClient: SupabaseClient | undefined;
}

function getClient(): SupabaseClient {
  if (global.__supabaseClient) return global.__supabaseClient;

  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error(
      "SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY precisam estar configurados (veja .env.example).",
    );
  }

  global.__supabaseClient = createClient(url, key, {
    auth: { persistSession: false },
  });
  return global.__supabaseClient;
}

interface ClienteRow {
  id: string;
  nome: string;
  segmento: string;
  sheet_id: string | null;
  aba_nome: string;
  pipefacil_pipeline_seq?: number | null;
  criado_em: string;
  meta_ad_account_id: string | null;
  meta_access_token: string | null;
}

function paraCliente(row: ClienteRow): Cliente {
  return {
    id: row.id,
    nome: row.nome,
    segmento: row.segmento,
    sheetId: row.sheet_id,
    abaNome: row.aba_nome,
    pipefacilPipelineSeq: row.pipefacil_pipeline_seq ?? null,
    criadoEm: row.criado_em,
    metaAdAccountId: row.meta_ad_account_id,
    metaAccessToken: row.meta_access_token,
  };
}

// Use isto (nunca o Cliente cru) em qualquer lugar que a resposta vá para
// o navegador — Server Component props ou JSON de rota de API.
export function paraClientePublico(cliente: Cliente): ClientePublico {
  const { metaAccessToken, ...resto } = cliente;
  return { ...resto, temTokenConfigurado: Boolean(metaAccessToken) };
}

export async function listarClientes(): Promise<Cliente[]> {
  const { data, error } = await getClient()
    .from("clientes")
    .select("*")
    .order("criado_em", { ascending: false });
  if (error) throw error;
  return (data ?? []).map(paraCliente);
}

export async function buscarCliente(id: string): Promise<Cliente | null> {
  const { data, error } = await getClient()
    .from("clientes")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (error) throw error;
  return data ? paraCliente(data) : null;
}

export async function criarCliente(
  input: NovoClienteInput & { sheetId: string | null },
): Promise<Cliente> {
  const { data, error } = await getClient()
    .from("clientes")
    .insert({
      nome: input.nome.trim(),
      segmento: input.segmento.trim(),
      sheet_id: input.sheetId,
      aba_nome: input.abaNome.trim() || "Leads",
      pipefacil_pipeline_seq: input.pipefacilPipelineSeq ?? null,
      meta_ad_account_id: input.metaAdAccountId?.trim() || null,
      meta_access_token: input.metaAccessToken?.trim() || null,
    })
    .select()
    .single();
  if (error) throw error;
  return paraCliente(data);
}

export async function atualizarCliente(
  id: string,
  dados: {
    nome: string;
    segmento: string;
    sheetId: string | null;
    pipefacilPipelineSeq: number | null;
    metaAdAccountId?: string;
    metaAccessToken?: string;
  },
): Promise<Cliente | null> {
  const update: Record<string, unknown> = {
    nome: dados.nome.trim(),
    segmento: dados.segmento.trim(),
    sheet_id: dados.sheetId,
    pipefacil_pipeline_seq: dados.pipefacilPipelineSeq,
    meta_ad_account_id: dados.metaAdAccountId?.trim() || null,
  };
  // O token nunca volta pro navegador (ver ClientePublico), então o campo
  // no formulário de edição fica sempre vazio — "vazio" aqui significa
  // "sem alteração", não "remover o token já salvo".
  if (dados.metaAccessToken?.trim()) {
    update.meta_access_token = dados.metaAccessToken.trim();
  }

  const { data, error } = await getClient()
    .from("clientes")
    .update(update)
    .eq("id", id)
    .select()
    .maybeSingle();
  if (error) throw error;
  return data ? paraCliente(data) : null;
}

export async function removerCliente(id: string): Promise<void> {
  const { error } = await getClient().from("clientes").delete().eq("id", id);
  if (error) throw error;
}

// ---------- Histórico e anúncio de origem dos leads do PipeFácil ----------

interface NegocioPipeFacilRow {
  seq: number;
  etapa_alterada_em: string | null;
  historico: EnriquecimentoNegocio["historico"];
  anuncio: EnriquecimentoNegocio["anuncio"];
  anuncio_lido: boolean;
}

// As duas funções engolem erro de propósito: sem a tabela (ou com o banco
// fora do ar) o painel continua funcionando, só relendo do CRM o que não
// estiver em memória.
export async function carregarEnriquecimentos(seqs: number[]): Promise<EnriquecimentoNegocio[]> {
  const resultado: EnriquecimentoNegocio[] = [];
  for (let i = 0; i < seqs.length; i += 300) {
    const { data, error } = await getClient()
      .from("pipefacil_negocios")
      .select("seq,etapa_alterada_em,historico,anuncio,anuncio_lido")
      .in("seq", seqs.slice(i, i + 300));
    if (error) {
      console.warn("pipefacil_negocios indisponível:", error.message);
      return resultado;
    }
    for (const row of (data ?? []) as NegocioPipeFacilRow[]) {
      resultado.push({
        seq: row.seq,
        etapaAlteradaEm: row.etapa_alterada_em,
        historico: row.historico,
        anuncio: row.anuncio,
        anuncioLido: row.anuncio_lido,
      });
    }
  }
  return resultado;
}

export async function salvarEnriquecimentos(itens: EnriquecimentoNegocio[]): Promise<void> {
  const { error } = await getClient()
    .from("pipefacil_negocios")
    .upsert(
      itens.map((e) => ({
        seq: e.seq,
        etapa_alterada_em: e.etapaAlteradaEm,
        historico: e.historico,
        anuncio: e.anuncio,
        anuncio_lido: e.anuncioLido,
        atualizado_em: new Date().toISOString(),
      })),
    );
  if (error) console.warn("Não foi possível salvar em pipefacil_negocios:", error.message);
}

// ---------- Miniaturas dos criativos (Supabase Storage) ----------
//
// O link de imagem que o Meta manda na mensagem do anúncio expira em poucos
// dias. Uma cópia é guardada num bucket público na primeira vez que o
// criativo aparece, enquanto o link ainda funciona.

const BUCKET_MINIATURAS = "miniaturas-criativos";

declare global {
  var __miniaturasArquivadas: Promise<Set<string>> | undefined;
}

export function urlMiniaturaArquivada(chave: string): string {
  return getClient().storage.from(BUCKET_MINIATURAS).getPublicUrl(`${chave}.jpg`).data.publicUrl;
}

// Lista uma vez por processo; depois o conjunto é atualizado a cada cópia.
export function listarMiniaturasArquivadas(): Promise<Set<string>> {
  if (!global.__miniaturasArquivadas) {
    global.__miniaturasArquivadas = (async () => {
      const chaves = new Set<string>();
      for (let offset = 0; ; offset += 1000) {
        const { data, error } = await getClient()
          .storage.from(BUCKET_MINIATURAS)
          .list("", { limit: 1000, offset });
        if (error) {
          console.warn("Bucket de miniaturas indisponível:", error.message);
          break;
        }
        for (const f of data) chaves.add(f.name.replace(/\.jpg$/, ""));
        if (data.length < 1000) break;
      }
      return chaves;
    })();
  }
  return global.__miniaturasArquivadas;
}

export async function arquivarMiniatura(chave: string, url: string): Promise<boolean> {
  let res: Response;
  try {
    res = await fetch(url, { cache: "no-store" });
  } catch {
    return false;
  }
  if (!res.ok) return false;
  const { error } = await getClient()
    .storage.from(BUCKET_MINIATURAS)
    .upload(`${chave}.jpg`, await res.arrayBuffer(), {
      contentType: res.headers.get("content-type") ?? "image/jpeg",
      upsert: true,
      cacheControl: "31536000",
    });
  if (error) {
    console.warn("Não foi possível arquivar a miniatura:", error.message);
    return false;
  }
  return true;
}

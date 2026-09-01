import { createClient, type SupabaseClient } from "@supabase/supabase-js";
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
  sheet_id: string;
  aba_nome: string;
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
  input: NovoClienteInput & { sheetId: string },
): Promise<Cliente> {
  const { data, error } = await getClient()
    .from("clientes")
    .insert({
      nome: input.nome.trim(),
      segmento: input.segmento.trim(),
      sheet_id: input.sheetId,
      aba_nome: input.abaNome.trim() || "Leads",
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
    sheetId: string;
    metaAdAccountId?: string;
    metaAccessToken?: string;
  },
): Promise<Cliente | null> {
  const update: Record<string, unknown> = {
    nome: dados.nome.trim(),
    segmento: dados.segmento.trim(),
    sheet_id: dados.sheetId,
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

import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { Cliente, NovoClienteInput } from "./types";

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
}

function paraCliente(row: ClienteRow): Cliente {
  return {
    id: row.id,
    nome: row.nome,
    segmento: row.segmento,
    sheetId: row.sheet_id,
    abaNome: row.aba_nome,
    criadoEm: row.criado_em,
  };
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
    })
    .select()
    .single();
  if (error) throw error;
  return paraCliente(data);
}

export async function atualizarCliente(
  id: string,
  dados: { nome: string; segmento: string; sheetId: string },
): Promise<Cliente | null> {
  const { data, error } = await getClient()
    .from("clientes")
    .update({
      nome: dados.nome.trim(),
      segmento: dados.segmento.trim(),
      sheet_id: dados.sheetId,
    })
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

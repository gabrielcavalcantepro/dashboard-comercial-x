-- Rode isso uma vez no SQL Editor do seu projeto Supabase
-- (https://supabase.com/dashboard/project/_/sql/new) antes do primeiro deploy.

create extension if not exists pgcrypto;

create table if not exists clientes (
  id uuid primary key default gen_random_uuid(),
  nome text not null,
  segmento text not null,
  sheet_id text not null,
  aba_nome text not null,
  criado_em timestamptz not null default now()
);

-- Integração com o PipeFácil: cada cliente pode apontar para um funil do
-- CRM (número sequencial do funil no workspace). Cliente novo, que nunca
-- teve planilha, fica com sheet_id nulo.
alter table clientes add column if not exists pipefacil_pipeline_seq integer;
alter table clientes alter column sheet_id drop not null;

-- Histórico de etapas e anúncio de origem de cada lead do PipeFácil, lidos
-- uma vez por lead (uma chamada ao CRM cada) e guardados aqui. seq é o
-- número do negócio no workspace do PipeFácil.
create table if not exists pipefacil_negocios (
  seq integer primary key,
  etapa_alterada_em timestamptz,
  historico jsonb,
  anuncio jsonb,
  anuncio_lido boolean not null default false,
  atualizado_em timestamptz not null default now()
);
alter table pipefacil_negocios disable row level security;

-- O app acessa essa tabela só pelo servidor (Server Components / Route
-- Handlers), usando a service role key, que ignora RLS. Row Level Security
-- fica desligado de propósito: não há acesso vindo do navegador.
alter table clientes disable row level security;

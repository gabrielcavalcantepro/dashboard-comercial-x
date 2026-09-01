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

-- O app acessa essa tabela só pelo servidor (Server Components / Route
-- Handlers), usando a service role key, que ignora RLS. Row Level Security
-- fica desligado de propósito: não há acesso vindo do navegador.
alter table clientes disable row level security;

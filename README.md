# Painel de Leads

Dashboard multi-cliente para acompanhar o funil comercial de leads médicos, com dados puxados
diretamente do Google Sheets de cada cliente.

## Stack

- **Next.js 16** (App Router) + **TypeScript** + **Tailwind CSS v4**
- **Supabase** (Postgres hospedado) para persistir a lista de clientes cadastrados
- **Recharts** + componentes customizados para os gráficos
- **Framer Motion** para as animações de entrada
- **html2canvas-pro** + **jsPDF** para o relatório em PDF (gerado no navegador)

Todo componente de interface (dropdowns, checkboxes, toggles, modais, toasts, tooltips, seletor de
período) foi construído do zero — nenhum estilo padrão de navegador é usado.

## Como rodar

```bash
npm install
cp .env.example .env.local
```

### 1. Google Sheets API

Edite `.env.local` e preencha `GOOGLE_SHEETS_API_KEY` com uma chave de API do Google Cloud
restrita à **Google Sheets API**:

1. Acesse [console.cloud.google.com](https://console.cloud.google.com/) → crie ou selecione um projeto
2. Ative a **Google Sheets API** em "APIs e Serviços"
3. Em "Credenciais" → "Criar credenciais" → "Chave de API"
4. Restrinja a chave: "Restrições de API" → apenas **Google Sheets API**

Essa única chave funciona para ler qualquer planilha pública (compartilhada como "Qualquer pessoa
com o link → Leitor"), independente de qual conta Google é dona dela.

### 2. Supabase (persistência dos clientes)

1. Crie um projeto gratuito em [supabase.com](https://supabase.com)
2. No **SQL Editor** do projeto, rode o conteúdo de [`supabase/schema.sql`](./supabase/schema.sql)
3. Em **Settings → API**, copie a **Project URL** e a **service_role key** para `.env.local`
   (`SUPABASE_URL` e `SUPABASE_SERVICE_ROLE_KEY`) — a service_role key só é usada no servidor,
   nunca é exposta ao navegador

```bash
npm run dev
```

Acesse `http://localhost:3000`.

## Deploy

Projeto pensado para **Vercel** (suporte nativo ao Next.js, sem adapter). Configure as três
variáveis de ambiente acima (`GOOGLE_SHEETS_API_KEY`, `SUPABASE_URL`,
`SUPABASE_SERVICE_ROLE_KEY`) no painel do projeto antes do primeiro deploy.

## Estrutura

```
app/
  page.tsx                 Página 1 — seleção de clientes
  clientes/[id]/page.tsx   Página 2 — dashboard do cliente
  api/clientes/...         Rotas de API (cadastro, validação, leitura de leads)
components/
  ui/                      Primitivos de interface (Select, Modal, Toast, Tooltip...)
  client-selection/        Página 1
  dashboard/               Página 2, filtros, KPIs, gráficos, relatório em PDF
lib/
  sheets.ts                Leitura e validação da planilha do Google Sheets
  metrics.ts                Cálculo de KPIs, funil, distribuições e desistência
  reason-categorize.ts      Categorização do motivo de desistência a partir do texto livre
  db.ts                     Persistência dos clientes (Supabase)
hooks/
  useLiveLeads.ts            Polling em segundo plano dos dados da planilha
supabase/
  schema.sql                 Schema da tabela de clientes
```

## Atualização em tempo real

Cada painel de cliente consulta a planilha a cada 25 segundos em segundo plano (sem recarregar a
página, sem perder filtros/scroll). Há um cache de 15 segundos no servidor para não estourar os
limites da Google Sheets API quando várias pessoas olham o mesmo painel ao mesmo tempo.

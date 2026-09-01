# Meta Ads API — Métricas e Criativos

## Credenciais necessárias

```js
META_TOKEN: 'SEU_TOKEN_AQUI'
AD_ACCOUNT_ID: 'act_XXXXXXXXXX'
```

Base URL: `https://graph.facebook.com/v21.0`

---

## Métricas agregadas do período

```
GET /{AD_ACCOUNT_ID}/insights?
  fields=spend,impressions,clicks,cpm,cpc,ctr,actions&
  time_range={"since":"2026-06-01","until":"2026-06-30"}&
  level=account&
  access_token={META_TOKEN}
```

### Campos retornados

| Campo | Métrica no dashboard |
|---|---|
| `spend` | Investimento (R$) |
| `impressions` | Impressões |
| `clicks` | Cliques no Link |
| `cpm` | CPM |
| `cpc` | CPC |
| `ctr` | CTR (%) |
| `actions` | Array de ações — ver abaixo |

### Conversas no WhatsApp

Dentro do array `actions`, filtrar pelo tipo:
```
onsite_conversion.messaging_conversation_started_7d
```
O `value` desse item é o número de conversas iniciadas.

O custo por conversa é calculado no frontend:
```js
custoPorConversa = spend / conversas
```

---

## Métricas diárias (gráfico de linha)

```
GET /{AD_ACCOUNT_ID}/insights?
  fields=spend,impressions,clicks,actions&
  time_range={"since":"2026-06-01","until":"2026-06-30"}&
  time_increment=1&
  level=account&
  access_token={META_TOKEN}
```

Retorna uma entrada por dia com os mesmos campos acima.
Cada entrada tem `date_start` com a data no formato `YYYY-MM-DD`.

---

## Métricas por objetivo de campanha

```
GET /{AD_ACCOUNT_ID}/insights?
  fields=campaign_id,campaign_name,objective,spend,impressions,clicks,cpm,cpc,ctr,actions&
  time_range={"since":"2026-06-01","until":"2026-06-30"}&
  level=campaign&
  access_token={META_TOKEN}
```

Retorna uma entrada por campanha. O campo `objective` indica o tipo:

| Valor da API | Label exibido |
|---|---|
| `MESSAGES` | Mensagens |
| `OUTCOME_TRAFFIC` | Tráfego |
| `OUTCOME_ENGAGEMENT` | Engajamento |
| `OUTCOME_LEADS` | Leads |
| `OUTCOME_SALES` | Vendas |
| `OUTCOME_AWARENESS` | Reconhecimento |

Usado para filtrar métricas por tipo de campanha no dashboard.
Quando há mais de um objetivo ativo, o dashboard exibe botões de filtro.

---

## Criativos ativos

### Passo 1 — Buscar ads ativos com métricas do período

```
GET /{AD_ACCOUNT_ID}/ads?
  fields=id,name,
         creative{id,name,thumbnail_url,image_url,video_id,
                  source_instagram_media_id,
                  object_story_spec{video_data{video_id}}},
         insights.time_range({"since":"...","until":"..."}){spend,impressions,clicks,cpm,cpc,ctr,actions}&
  filtering=[{"field":"effective_status","operator":"IN","value":["ACTIVE"]}]&
  limit=50&
  access_token={META_TOKEN}
```

> ⚠️ O `time_range` deve ser passado dentro do campo `insights` via field expansion
> (`insights.time_range(...){...}`), não como parâmetro raiz — caso contrário
> as métricas não refletem o período selecionado.

### Campos do criativo

| Campo | Uso |
|---|---|
| `thumbnail_url` | Thumbnail baixa resolução — evitar |
| `image_url` | Imagem em alta resolução — usar este |
| `video_id` | ID do vídeo (se for criativo de vídeo) |
| `source_instagram_media_id` | Preenchido quando é post impulsionado do Instagram |

### Métricas por criativo

Dentro de `insights.data[0]`:

| Campo | Métrica |
|---|---|
| `spend` | Investimento |
| `impressions` | Impressões |
| `clicks` | Cliques |
| `cpm` | CPM |
| `cpc` | CPC |
| `ctr` | CTR |
| `actions` | Conversas (mesmo filtro do agregado) |

---

### Passo 2 — Buscar URL do vídeo

```
GET /{VIDEO_ID}?
  fields=source,format,picture&
  access_token={META_TOKEN}
```

| Campo | Uso |
|---|---|
| `source` | URL direta do vídeo para reprodução |
| `format[].picture` | Thumbnail HD do vídeo |
| `picture` | Thumbnail alternativa |

> ⚠️ Para vídeos de posts impulsionados do Instagram, `source` não é retornado
> pela API. Nesses casos, exibir a thumbnail e um link para ver no Instagram.

---

### Passo 3 — Permalink de posts impulsionados

Quando `source_instagram_media_id` está preenchido no criativo, é um post impulsionado.

```
GET /{source_instagram_media_id}?
  fields=permalink&
  access_token={META_TOKEN}
```

Retorna a URL do post original no Instagram.

---

## Período anterior (variação percentual)

Para calcular a variação de cada métrica em relação ao período anterior,
basta fazer a mesma query de métricas agregadas com um `time_range` deslocado:

```js
// Se o período é 7 dias (01/06 a 07/06),
// o período anterior é os 7 dias antes (25/05 a 31/05)
const diffDias = (dataFim - dataInicio) em dias
fimAnterior = dataInicio - 1 dia
inicioAnterior = fimAnterior - diffDias
```

A variação é calculada assim:
```js
variacao = ((valorAtual - valorAnterior) / valorAnterior) * 100
```

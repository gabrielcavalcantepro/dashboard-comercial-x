# Dashboard de Leads Médicos — Especificação do Projeto

## 1. Contexto

Somos uma agência que acompanha o funil comercial de clientes médicos (clínicas, consultórios,
profissionais de saúde). Cada cliente tem sua própria planilha no Google Sheets onde a equipe
comercial registra e atualiza os leads recebidos. Queremos um dashboard multi-cliente: uma agência
consegue cadastrar quantos clientes quiser, e cada um tem seu próprio painel de métricas puxado
direto da planilha dele.

Este documento descreve **o que** o produto precisa fazer e **como** queremos que ele se comporte.
A implementação (stack, arquitetura de código, organização de arquivos) fica a critério de quem
for construir — queremos direção clara, não uma receita engessada.

## 2. Fonte de dados: Google Sheets

Leitura via API pública do Google Sheets, sem OAuth:

```
GET https://sheets.googleapis.com/v4/spreadsheets/{SHEETS_ID}/values/{ABA}?key={API_KEY}
```

- Uma única API Key (restrita à Google Sheets API) funciona para **qualquer** planilha pública,
  independente de qual conta Google é dona dela. O único requisito é a planilha estar
  compartilhada como "Qualquer pessoa com o link → Leitor".
- A primeira linha da aba é sempre o cabeçalho.
- **A aba pode ter nome diferente em cada cliente** — não travar no nome fixo "Leads". Isso é um
  campo configurável por cliente (ver seção 4).

### Estrutura real das colunas (validada com print da planilha em produção)

| Coluna | Campo | Observações |
|---|---|---|
| A | Data de contato | data do primeiro contato com o lead |
| B | Vendedor | nome de quem está atendendo |
| C | Nome do Lead / número | às vezes é nome, às vezes só telefone — tratar como texto livre |
| D | Fonte | ex: Resgate, Tráfego Pago, Prospecção... |
| E | Lead Qualificado? | Sim / Não |
| F | Procedimento | procedimento médico de interesse do lead |
| G | Ticket Médio (R$) | valor estimado do procedimento |
| H | Status | **3 estados**: `Agendado`, `Avaliando`, `Desistiu` |
| I | Data Agendamento | preenchida quando Status = Agendado |
| J | Observações | texto livre — às vezes é horário do agendamento ("16H30"), às vezes é motivo de desistência ("não respondeu", "sumiu após passar valor") |

⚠️ **Importante sobre o Status:** são 3 estados, não 2. "Avaliando" é lead ainda em aberto — não
deve contar como fechamento nem como desistência nos cálculos de taxa, senão as taxas ficam
erradas enquanto o funil ainda está rodando. Trate "Avaliando" como pipeline ativo, separado do
resultado final (Agendado ou Desistiu).

A estrutura pode variar levemente entre clientes (nomes de coluna, ordem). O sistema deve validar
o cabeçalho ao cadastrar um cliente novo e avisar de forma clara se algo essencial não bate, em vez
de quebrar silenciosamente.

## 3. Páginas e navegação

### Página 1 — Seleção de Clientes
Lista/grade dos clientes cadastrados (nome, segmento, e algum indicador rápido tipo "leads no
mês" se fizer sentido no layout). Botão de destaque para "Adicionar Cliente". Clicar em um cliente
leva à Página 2 daquele cliente.

### Fluxo "Adicionar Cliente"
Formulário (modal ou tela própria) com:
- Nome do Cliente
- Segmento (ex: Odontologia, Dermatologia, Estética...)
- Link da planilha (o sistema extrai o ID sozinho a partir da URL colada)
- Nome da Aba (campo editável, com "Leads" como valor padrão)

Ao salvar: validar que a planilha é acessível e que o cabeçalho da aba faz sentido com a estrutura
esperada antes de confirmar o cadastro. Se algo não bater, mostrar isso ao usuário de forma clara,
sem jargão técnico de API.

**Persistência:** a lista de clientes cadastrados precisa sobreviver entre sessões e dispositivos
(não pode depender só do navegador local) — use algum banco de dados real por trás. A escolha da
tecnologia fica livre, mas o requisito de persistência confiável não é negociável.

### Página 2 — Dashboard do Cliente
KPIs, gráficos e filtros descritos nas seções 4 e 5, com o nome/segmento/logo do cliente em
destaque no topo. Deve existir um caminho claro de volta para a Página 1.

## 4. Métricas e KPIs

Cards de destaque no topo do dashboard:
- Total de Leads (no período filtrado)
- Leads Qualificados
- Agendamentos (fechamentos)
- Leads em Avaliação (pipeline ainda aberto)
- Taxa de Qualificação
- Taxa de Fechamento (sobre qualificados)
- Taxa de Desistência
- Ticket Médio
- Receita Projetada (soma do Ticket Médio dos leads agendados)
- Variação de cada KPI acima vs. o período anterior equivalente

## 5. Gráficos

**Funil e evolução**
- Funil de conversão: Total → Qualificados → Agendados (mostrando onde o funil perde mais gente)
- Evolução temporal de leads (por dia/semana/mês, conforme período selecionado)
- Taxa de Qualificação e Taxa de Fechamento ao longo do tempo (tendência, não só o número atual)
- Tempo médio até o agendamento (Data de contato → Data Agendamento)

**Origem e distribuição**
- Leads por Fonte
- Leads por Procedimento
- Ticket Médio por Procedimento
- Leads por dia da semana / data de contato — para identificar padrões de volume

**Performance do time**
- Performance por Vendedor: leads atendidos, taxa de conversão e ticket médio, lado a lado

**Desistência (linha de análise pedida especificamente pelo cliente)**
- Taxa de Desistência geral
- Desistência por Fonte — qual canal traz lead que mais desiste
- Desistência por Vendedor
- Desistência pós-qualificação — leads com "Lead Qualificado = Sim" que mesmo assim desistiram;
  esse é o vazamento mais caro do funil porque o lead já tinha demonstrado interesse real
- Motivo de desistência, categorizado a partir do texto livre da coluna Observações (ex: "não
  respondeu" vs. "sumiu após valor passado" vs. outros) — agrupar por palavra-chave, não tratar
  como campo estruturado
- Taxa de não-resposta isolada da desistência por preço/oferta (são problemas de natureza
  diferente: um é de agilidade/abordagem, o outro é de oferta)

**Filtros globais do dashboard:** período (por Data de contato), vendedor, fonte, procedimento e
status.

## 6. Atualização de dados em tempo real

Os dados da planilha devem atualizar sozinhos em segundo plano, em intervalos curtos, **sem reload
de página e sem interromper o que o usuário está fazendo** (filtros aplicados, scroll, modais
abertos devem persistir durante a atualização). Um indicador discreto de "última atualização" é
bem-vindo, mas nada de alertas ou pop-ups chamativos a cada refresh. O intervalo exato de polling
fica a critério de quem implementar, respeitando os limites da Google Sheets API.

## 7. Identidade visual

- **Cor base:** `#151515` — sempre tema escuro/black, não terá modo claro
- **Cor de destaque:** `#fad214`
- **Logo:** arquivo `logo.png` será adicionado na pasta do projeto — usar no cabeçalho / tela de
  seleção de clientes
- **Tipografia:** títulos em `ui-sans-serif, system-ui, sans-serif`; todo o restante do texto
  (corpo, labels, dados) em `Poppins`
- **Tooltips de métrica:** todo card de métrica e todo gráfico tem um ícone "?" pequeno e discreto;
  ao passar o mouse (ou clicar, pensando em mobile) aparece uma explicação flutuante do que aquele
  número ou gráfico significa. Deve ser sutil — não pode competir visualmente com o dado principal.

### Nada de estilo padrão de navegador
Todo elemento de interface deve ser estilizado do zero: dropdowns/selects customizados (nada da
lista azul nativa do navegador), checkboxes e toggles customizados, sem `alert()`/`confirm()`
nativos do navegador (usar modais e toasts próprios do produto), sem qualquer elemento com a cara
padrão de HTML sem estilo.

### Direção de design
Queremos um dashboard bonito, com um layout que não pareça um template genérico de SaaS — algo que
chame atenção por ser bem pensado e diferente do óbvio. Algumas diretrizes, mantendo espaço para
decisões criativas de quem for construir:

- Fugir do "kit SaaS genérico": cards idênticos com o mesmo border-radius e a mesma sombra em tudo,
  sem hierarquia visual entre eles.
- Evitar rótulos em CAIXA ALTA por toda parte e "eyebrows" repetidos acima de cada seção — se não
  ajudam a entender o dado, são só ruído.
- Usar o contraste entre a fonte de título (`ui-sans-serif, system-ui, sans-serif`) e o corpo em
  Poppins pra criar hierarquia — sem depender de caixa alta ou cor pra isso.
- Uma animação bem pensada em um momento-chave (ex: entrada dos gráficos, transição entre
  clientes) rende mais do que efeito de hover/fade repetido em cada card da tela.
- Respeitar acessibilidade básica: foco de teclado visível, contraste de leitura confortável mesmo
  no tema escuro, responsivo em telas menores.

O objetivo final: alguém abrir esse dashboard e sentir que foi feito sob medida para o produto —
não que veio de um gerador de templates.

## 8. Planilha de referência (cliente piloto)

```
https://docs.google.com/spreadsheets/d/1RJZUuoHbFMlzJnUaRzKtp5XBED7g8Y5EDbu_il-Eblc/edit?usp=sharing
```

Use esta planilha como referência real de estrutura e dados durante o desenvolvimento.

# Fase 0 - Contrato Tecnico Unico dos Buscadores GLPI

Data de congelamento: 2026-03-20
Status: AS-IS documentado (sem alteracao de codigo)
Escopo: buscador-dtic, buscador-sis-manutencao, buscador-sis-conservacao

## 1. Objetivo

Documentar o contrato HTTP e os defaults reais de execucao para remover ambiguidade entre UI, API e operacao.

## 2. Regras comuns de API

- Runtime: `nodejs`
- Dynamic rendering: `force-dynamic`
- Gate de contexto por rota:
  - contexto recebido pela URL (`/api/v1/[context]/...`)
  - normalizacao: prefixo `sis* -> sis`, `dtic* -> dtic`
  - regra: contexto normalizado deve ser igual a `APP_CONTEXT_ROOT`
- Erros padrao:
  - `400`: validacao de query falhou (`zod.flatten`)
  - `404`: contexto invalido para a aplicacao
  - `500`: erro interno com `detail`

## 3. Contrato DTIC (buscador-dtic)

Base path: `/api/v1/{context}` com `APP_CONTEXT_ROOT=dtic`.

### 3.1 GET `/db/filter-options`

Query params:
- nenhum

Resposta 200:
- `requestTypes[] { id, label, total }`
- `entities[] { id, label, total }`
- `categories[] { id, label, total }`
- `locations[] { id, label, total }`
- `groups[] { id, label, total }`
- `technicians[] { id, label, total }`
- `context`

### 3.2 GET `/db/stats`

Query params aceitos:
- `group_ids`: csv de inteiros positivos
- `department`: string opcional
- `universe`: `active|historical` (opcional)
- `requesttypes_id`: csv int
- `entities_id`: csv int
- `locations_id`: csv int
- `technician_id`: int
- `category_id`: int
- `date_from`: `YYYY-MM-DD`
- `date_to`: `YYYY-MM-DD`

Defaults server-side:
- `universe` omitido => `active`

Resposta 200:
- `novos`
- `em_atendimento`
- `pendentes`
- `solucionados`
- `fechados`
- `solucionados_recentes`
- `total_abertos`
- `total`
- `context`

### 3.3 GET `/db/tickets`

Query params aceitos:
- todos de `/db/stats`
- `status`: csv int
- `requester_id`: int
- `limit`: int `1..500` (default `100`)
- `offset`: int `>=0` (default `0`)

Defaults server-side:
- `universe` omitido => `active`
- sem `status` => sem filtro adicional de status alem do `universe`

Ordenacao:
- `ORDER BY t.date DESC, t.id DESC`

Resposta 200:
- `total`, `limit`, `offset`, `context`
- `data[]` com campos de ticket normalizados

### 3.4 GET `/tickets/search`

Query params aceitos:
- todos de `/db/stats`
- `q`: string obrigatoria (trim, min 1)
- `status`: csv int
- `depth`: `basic|expanded` (opcional)
- `limit`: int `1..200` (default `50`)

Defaults server-side:
- `universe` omitido => `active`
- `depth` omitido => `basic`

Semantica:
- `q` numerico => `t.id = q`
- `q` textual:
  - `basic`: `name/content/id` via `LIKE`
  - `expanded`: adiciona `EXISTS` em `followups/tasks/solutions`

Ordenacao:
- `ORDER BY t.date_mod DESC, t.id DESC`

Resposta 200:
- `total`, `query`, `context`, `department`
- `data[]` com `relevance` e (quando aplicavel) `matchSource`/`matchExcerpt`

## 4. Contrato SIS (manutencao e conservacao)

Base path: `/api/v1/{context}` com `APP_CONTEXT_ROOT=sis`.

### 4.1 GET `/db/stats`

Query params aceitos:
- `group_ids`: csv int
- `department`: string opcional

Defaults server-side:
- sem outros filtros de date/status no contrato atual
- query de stats sempre fecha em status `1..5`

Resposta 200:
- `novos`
- `em_atendimento`
- `pendentes`
- `solucionados`
- `solucionados_recentes`
- `total_abertos`
- `total`
- `context`

### 4.2 GET `/db/tickets`

Query params aceitos:
- `group_ids`, `department`
- `status`: csv int
- `requester_id`: int
- `date_from`: `YYYY-MM-DD`
- `date_to`: `YYYY-MM-DD`
- `limit`: int `1..500` (default `100`)
- `offset`: int `>=0` (default `0`)

Defaults server-side:
- `status` omitido => sem filtro de status

Ordenacao:
- `ORDER BY t.date DESC, t.id DESC`

Resposta 200:
- `total`, `limit`, `offset`, `context`
- `data[]`

### 4.3 GET `/tickets/search`

Query params aceitos:
- `q` obrigatorio
- `department` opcional
- `status` csv int opcional
- `limit`: int `1..200` (default `50`)

Defaults server-side:
- `status` omitido => sem filtro de status

Semantica:
- `q` numerico => `t.id = q`
- `q` textual => `LIKE` em `name/content/id` por termo

Ordenacao:
- `ORDER BY t.date_mod DESC, t.id DESC`

Resposta 200:
- `total`, `query`, `context`, `department`
- `data[]` com `relevance`

## 5. Defaults reais do frontend (hook)

### 5.1 DTIC

- `universe` inicial: `historical`
- `depth` inicial: `basic`
- periodo inicial: ultimos `90` dias
- termo vazio: carrega base + polling habilitado
- termo `1` caractere: nao consulta search remota
- termo `>=2`: usa endpoint de search
- limites de carga:
  - list: `DB_LIST_LIMIT=500`
  - search: `DB_SEARCH_LIMIT=200`

### 5.2 SIS (manutencao/conservacao)

- periodo inicial: ultimos `90` dias
- `status` default do hook: `[1,2,3,4,5]`
- termo vazio: carrega base + polling habilitado
- termo `1` caractere: nao consulta search remota
- termo `>=2`: usa endpoint de search
- limites de carga:
  - list: `DB_LIST_LIMIT=500`
  - search: `DB_SEARCH_LIMIT=200`

## 6. Inconsistencias conhecidas (AS-IS)

1. SIS: stats sempre em `1..5`, mas list/search aceitam todos os status quando `status` e omitido.
2. DTIC: server default de `universe` e `active`, enquanto UI padrao envia `historical`.
3. Clientes externos que nao enviam filtros explicitos podem observar semantica diferente da UI.

## 7. Politica de contrato para Fase 1 (a implementar depois)

Sem mudar codigo nesta fase, fica definido para implementacao futura:

1. Todo cliente oficial deve enviar explicitamente:
- DTIC: `universe`, `depth`, `date_from`, `date_to`
- SIS: `status`, `date_from`, `date_to`

2. Contrato deve ficar semanticamente alinhado entre:
- stats
- list
- search

3. Qualquer mudanca de default server-side deve ser versionada em changelog de contrato.

## 8. Variaveis de ambiente obrigatorias

Comuns:
- `GLPI_DB_HOST`
- `GLPI_DB_PORT`
- `GLPI_DB_USER`
- `GLPI_DB_PASSWORD`
- `GLPI_DB_NAME`
- `GLPI_DB_POOL_LIMIT`
- `APP_CONTEXT_ROOT`
- `APP_CATEGORY_FILTER` (opcional)
- `APP_CATEGORY_ROOT_ID` (opcional)
- `APP_DB_TIMEZONE`

Frontend:
- `NEXT_PUBLIC_API_URL` (opcional; vazio usa rota relativa)

## 9. Referencias internas

- DTIC validators: `buscador-dtic/src/lib/api/server/validators.ts`
- DTIC repository: `buscador-dtic/src/lib/api/server/ticketsRepository.ts`
- SIS validators: `buscador-sis-manutencao/src/lib/api/server/validators.ts`
- SIS repository: `buscador-sis-manutencao/src/lib/api/server/ticketsRepository.ts`
- Context gate: `src/lib/api/server/context.ts` (todos os repos)

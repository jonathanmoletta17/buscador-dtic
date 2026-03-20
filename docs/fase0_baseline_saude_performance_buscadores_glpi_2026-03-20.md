# Fase 0 - Baseline de Performance e Saude (AS-IS)

Data da coleta: 2026-03-20
Metodo: smoke HTTP + carga leve local por endpoint
Observacao: sem alteracoes de codigo na coleta

## 1. Resultado global

- Build quality: verde em DTIC e SIS (lint/test/build)
- Endpoints criticos: HTTP 200 nos tres buscadores
- Vulnerabilidades prod (`npm audit --omit=dev`): 0 nos dois repos SIS

## 2. Latencia por contexto

### 2.1 DTIC (30 requests por endpoint)

- `/api/v1/dtic/db/stats?universe=historical`
  - avg: 25.20 ms
  - p95: 27.43 ms
  - max: 72.76 ms
- `/api/v1/dtic/db/tickets?limit=50&universe=historical`
  - avg: 740.69 ms
  - p95: 883.56 ms
  - max: 897.58 ms
- `/api/v1/dtic/tickets/search?q=rede&limit=50&depth=basic&universe=historical`
  - avg: 396.15 ms
  - p95: 443.17 ms
  - max: 482.92 ms
- `/api/v1/dtic/tickets/search?q=rede&limit=50&depth=expanded&universe=historical`
  - avg: 1041.17 ms
  - p95: 1304.37 ms
  - max: 1313.65 ms

### 2.2 SIS manutencao (40 requests por endpoint)

- `/api/v1/sis/db/stats`
  - avg: 11.55 ms
  - p95: 14.25 ms
  - max: 62.33 ms
- `/api/v1/sis/db/tickets?limit=20`
  - avg: 170.48 ms
  - p95: 191.64 ms
  - max: 193.48 ms
- `/api/v1/sis/tickets/search?q=rede&limit=20`
  - avg: 92.48 ms
  - p95: 103.52 ms
  - max: 106.50 ms

### 2.3 SIS conservacao (40 requests por endpoint)

- `/api/v1/sis/db/stats`
  - avg: 11.71 ms
  - p95: 11.68 ms
  - max: 63.52 ms
- `/api/v1/sis/db/tickets?limit=20`
  - avg: 209.91 ms
  - p95: 250.53 ms
  - max: 263.63 ms
- `/api/v1/sis/tickets/search?q=rede&limit=20`
  - avg: 79.53 ms
  - p95: 96.98 ms
  - max: 103.81 ms

## 3. Semantica observada em runtime

### 3.1 DTIC

- `stats_default_total=4800`
- `stats_active_total=4800`
- `stats_historical_total=12793`

Conclusao: default server de `universe` equivale a `active`.

### 3.2 SIS (manutencao)

- count total sem filtro de status: `3228`
- count em status `1..5`: `97`

### 3.3 SIS (conservacao)

- count total sem filtro de status: `3671`
- count em status `1..5`: `7`

Conclusao: sem `status` explicito, list/search podem divergir de stats.

## 4. Volumetria (estimativa TABLE_ROWS)

### 4.1 DTIC (glpi2db)

- `glpi_tickets`: ~13.349
- `glpi_tickets_users`: ~29.155
- `glpi_itilfollowups`: ~15.680
- `glpi_tickettasks`: ~2.610
- `glpi_itilsolutions`: ~10.031

### 4.2 SIS (sisdb)

- `glpi_tickets`: ~6.361
- `glpi_tickets_users`: ~14.384
- `glpi_itilfollowups`: ~9.746
- `glpi_tickettasks`: ~9.148
- `glpi_itilsolutions`: ~6.224

## 5. Leitura executiva

1. DTIC e o principal hotspot, sobretudo em `search expanded`.
2. SIS esta estavel em latencia, mas com risco semantico se cliente nao enviar `status` explicitamente.
3. Fase 1 deve atacar primeiro:
- contrato explicito de filtros
- custo de contagem
- estrategia de polling/jitter

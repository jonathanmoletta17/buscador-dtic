# Fase 0 - Checklist Operacional Infra/Dev (Buscadores GLPI)

Data: 2026-03-20
Status: pronto para uso operacional
Escopo: DTIC + SIS manutencao + SIS conservacao

## 1. Objetivo

Padronizar validacao antes/depois de deploy para reduzir risco de indisponibilidade, drift de contrato e sobrecarga no MariaDB.

## 2. Responsabilidades

- Dev: build, testes, smoke HTTP e validacao de contrato.
- Infra: saude do banco, capacidade de conexoes, logs e rollback de runtime.
- Operacao funcional: validacao de busca e filtros em tela.

## 3. Pre-deploy (obrigatorio)

### 3.1 Codigo

Executar em cada repo:

```powershell
npm run lint
npm run test:run
npm run build
```

Gate:
- 100% verde, sem falhas.

### 3.2 Configuracao

Conferir `.env.local`/env de runtime:
- `APP_CONTEXT_ROOT` coerente com o repo:
  - DTIC: `dtic`
  - SIS: `sis`
- `GLPI_DB_POOL_LIMIT` definido (recomendado inicial: `10`)
- `APP_CATEGORY_ROOT_ID` correto por contexto SIS
- `APP_DB_TIMEZONE` coerente (`-03:00`)

Gate:
- nenhum default perigoso ativo por engano.

### 3.3 Banco (janela de deploy)

Executar no MariaDB:

```sql
SHOW GLOBAL VARIABLES LIKE 'max_connections';
SHOW GLOBAL VARIABLES LIKE 'wait_timeout';
SHOW GLOBAL VARIABLES LIKE 'interactive_timeout';
SHOW GLOBAL STATUS LIKE 'Threads_connected';
SHOW GLOBAL STATUS LIKE 'Threads_running';
```

Gate:
- capacidade e timeout alinhados com politica da infra.

## 4. Smoke pos-start (obrigatorio)

### 4.1 DTIC

```powershell
Invoke-WebRequest "http://HOST:PORT/api/v1/dtic/db/stats?universe=historical"
Invoke-WebRequest "http://HOST:PORT/api/v1/dtic/db/tickets?universe=historical&limit=5"
Invoke-WebRequest "http://HOST:PORT/api/v1/dtic/tickets/search?q=rede&universe=historical&depth=basic&limit=5"
Invoke-WebRequest "http://HOST:PORT/api/v1/dtic/tickets/search?q=rede&universe=historical&depth=expanded&limit=5"
Invoke-WebRequest "http://HOST:PORT/api/v1/dtic/db/filter-options"
```

### 4.2 SIS manutencao

```powershell
Invoke-WebRequest "http://HOST:PORT/api/v1/sis/db/stats"
Invoke-WebRequest "http://HOST:PORT/api/v1/sis/db/tickets?status=1,2,3,4,5&limit=5"
Invoke-WebRequest "http://HOST:PORT/api/v1/sis/tickets/search?q=rede&status=1,2,3,4,5&limit=5"
```

### 4.3 SIS conservacao

```powershell
Invoke-WebRequest "http://HOST:PORT/api/v1/sis/db/stats"
Invoke-WebRequest "http://HOST:PORT/api/v1/sis/db/tickets?status=1,2,3,4,5&limit=5"
Invoke-WebRequest "http://HOST:PORT/api/v1/sis/tickets/search?q=rede&status=1,2,3,4,5&limit=5"
```

Gate:
- HTTP 200 em todos os endpoints.
- payload com `total` e `data` coerentes.

## 5. Monitoracao obrigatoria apos deploy

Janelas: +15min, +60min, +240min.

### 5.1 Banco

```sql
SHOW GLOBAL STATUS LIKE 'Threads_connected';
SHOW GLOBAL STATUS LIKE 'Threads_running';
SHOW FULL PROCESSLIST;
```

Acompanhar:
- crescimento indefinido de conexoes `Sleep`
- concentracao por `Host/User`
- spikes de `Threads_running`

### 5.2 Aplicacao

Coletar por endpoint:
- taxa de erro 5xx
- latencia p50/p95
- volume de requests por minuto

## 6. SLO/SLA operacional inicial

### 6.1 DTIC

- `db/stats` p95 <= 50ms
- `db/tickets` p95 <= 900ms (baseline atual)
- `tickets/search basic` p95 <= 450ms (baseline atual)
- `tickets/search expanded` p95 <= 1300ms (baseline atual)

### 6.2 SIS

- `db/stats` p95 <= 30ms
- `db/tickets` p95 <= 260ms
- `tickets/search` p95 <= 120ms

## 7. Alertas e gatilhos de incidente

Abrir incidente imediato se qualquer item ocorrer por > 10 min:

1. erro 5xx > 1%
2. p95 > 2x baseline
3. `Threads_connected` em tendencia de alta continua sem retorno
4. report de queda/instabilidade do GLPI associada a janela de deploy

## 8. Acoes imediatas de contencao

1. reduzir entrada de carga (limitar acessos nao criticos)
2. pausar/reduzir polling de UI (quando configuravel)
3. confirmar contexto/env corretos (`APP_CONTEXT_ROOT`, category root)
4. reiniciar somente o servico impactado (evitar restart em cascata)
5. se necessario, rollback para versao anterior estavel

## 9. Rollback operacional (padrao)

1. selecionar ultimo artefato estavel aprovado
2. redeploy somente do repo impactado
3. rerodar smoke de endpoints
4. validar banco por 60 min
5. registrar causa, hora e evidencias

## 10. Evidencias minimas por deploy

Salvar em `docs/deploy-evidences/<YYYY-MM-DD>/`:

1. output de `lint/test/build`
2. output de smoke HTTP
3. snapshot de `SHOW GLOBAL STATUS` (antes/depois)
4. amostra de `SHOW FULL PROCESSLIST` (antes/depois)
5. observacao funcional (UI)

## 11. Politica de mudanca

- Sem contrato documentado e checklist executado: deploy bloqueado.
- Sem baseline atualizado apos mudanca relevante: deploy bloqueado.
- Sem plano de rollback: deploy bloqueado.

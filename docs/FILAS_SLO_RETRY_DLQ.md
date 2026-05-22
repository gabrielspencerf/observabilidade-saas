# Política de filas, SLO e retry

Objetivo: manter processamento previsível sem fila única opaca.

## Implementação

- Arquivo: `src/workers/queue/policy.ts`
- Aplicação no runtime: `src/workers/runner.ts`

## Criticidade por tipo de job

- **P0 (slo 30s)**: ingestão de canais (`process_*_raw`)
- **P1 (slo 120s)**: sincronizações operacionais e follow-up
- **P2 (slo 300s)**: classificação IA

## Política padrão

- Backoff exponencial por criticidade.
- `maxAttempts` por classe:
  - P0: 6
  - P1: 5
  - P2: 4
- Estouro de tentativas envia para DLQ correspondente.

## Observabilidade mínima

- Eventos emitidos pelo worker:
  - `worker.job.processed`
  - `worker.job.retry_scheduled`
  - `worker.job.sent_to_dlq`
- Falhas persistidas em `processing_failures`.

## Operação recomendada

1. Monitorar crescimento de DLQ por tipo de job.
2. Priorizar correção de P0 antes de P1/P2.
3. Reprocessar DLQ apenas com causa raiz identificada.

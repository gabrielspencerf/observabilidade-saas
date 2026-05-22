# Eventos e observabilidade mínima

Objetivo: dar rastreabilidade a fluxos críticos antes de adoção de stack completa de observabilidade.

## Implementação

- Emissor central:
  - `src/server/observability/domain-events.ts`
- Uso atual:
  - webhooks (ingest success/failure)
  - chat Vysen (success/failure)
  - worker (processed/retry/DLQ)

## Convenção de evento

- Nome: `dominio.acao.resultado`
  - exemplos:
    - `webhook.chatwoot.ingested`
    - `worker.job.retry_scheduled`
    - `vysen.chat.failed`
- Campos mínimos:
  - `ts`, `event`, `tenantId`, `metadata`

## Próximos passos recomendados

1. Encaminhar eventos para sink (OTEL/log processor) sem quebrar contrato.
2. Criar alertas de backlog e erro por criticalidade de fila.
3. Criar painéis por namespace de evento.

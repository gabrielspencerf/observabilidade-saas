# Contrato de API e Webhooks

## API interna (`/api/dashboard/*`)

- Contrato envelope:
  - sucesso: `{ ok: true, data }`
  - falha: `{ ok: false, error: { code, message } }`
- Header de versão:
  - `x-api-version: 2026-04-26`
- Implementação base:
  - `src/server/http/api-contract.ts`

## Webhooks (`/api/webhooks/*`)

- Header de contrato:
  - `x-webhook-contract-version: 2026-04-26`
- Header de idempotência:
  - `x-webhook-idempotency-key: <externalEventId|fallback>`
- Header replay window:
  - `x-webhook-replay-window-seconds: 600`

## Rotas migradas para o contrato

- `src/app/api/webhooks/typebot/[botId]/route.ts`
- `src/app/api/webhooks/evolution/[instanceId]/route.ts`
- `src/app/api/webhooks/uazapi/[instanceId]/route.ts`
- `src/app/api/webhooks/chatwoot/[accountId]/route.ts`
- `src/app/api/webhooks/whatsapp-cloud/[numberId]/route.ts`
- `src/app/api/dashboard/vysen/chat/route.ts`
- `src/app/api/dashboard/notifications/route.ts`

## Regras de evolução

1. Alterou payload de resposta? Atualizar versão de contrato.
2. Novo webhook deve sair com replay protection + assinatura + headers de contrato.
3. Nunca acoplar payload de integração à renderização da UI.

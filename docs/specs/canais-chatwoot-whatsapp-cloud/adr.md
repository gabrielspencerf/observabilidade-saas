# ADR-2026-04-canais-nativos-modelagem-minima

## Status
Proposto

## Contexto
- O sistema atual suporta conversas com forte acoplamento a `evolution_instances` e `uazapi_instances`.
- Precisamos adicionar Chatwoot e WhatsApp Cloud sem abrir refactor transversal.
- Existe requisito explicito de evitar duplicacao caotica de fonte de verdade.

## Decisao
- Adotar crescimento incremental por extensao de modelagem existente, sem criar camada generica de canal neste momento.
- Introduzir recursos dedicados por canal:
  - `chatwoot_accounts`
  - `whatsapp_cloud_numbers`
- Estender `conversations` para aceitar novos recursos mantendo regra de exatamente uma origem operacional por conversa.
- Definir fonte de verdade por origem operacional da conversa e regra de anti-colisao por numero/canal no tenant.
- Para Chatwoot MVP:
  - account como entidade principal com `inbox_id` opcional.
- Para WhatsApp Cloud MVP:
  - assumir conversa operacional por contato/canal no recorte inicial.

## Consequencias
- Positivas:
  - Menor risco de regressao na base atual.
  - Menor custo de entrega inicial.
  - Mantem padrao ja consolidado de raw events e deduplicacao.
- Negativas:
  - Persistencia de alguma repeticao por canal (aceita no curto prazo).
  - Possivel necessidade futura de abstrair inbox/multi-thread se escopo crescer.
- Trade-offs aceitos:
  - Preferir simplicidade e compatibilidade agora em vez de arquitetura generica prematura.

## Alternativas consideradas
1. Criar modelo totalmente generico de canais/inboxes no inicio.
   - Rejeitada por risco alto e escopo transversal.
2. Manter somente Evolution/UAZAPI e integrar Chatwoot/WhatsApp por adaptacao externa.
   - Rejeitada por limitar estrategia de canais nativos.
3. Extensao incremental da modelagem atual (decisao escolhida).
   - Aceita por menor mudanca segura.

## Evidencias
- `docs/specs/canais-chatwoot-whatsapp-cloud/spec.md`
- `docs/specs/canais-chatwoot-whatsapp-cloud/plan.md`
- `docs/specs/canais-chatwoot-whatsapp-cloud/validation.md`
- Arquivos base do estado atual:
  - `src/db/schema/conversations/conversations.ts`
  - `src/server/dashboard/conversations.ts`
  - `src/server/dashboard/conversation-detail.ts`
  - `src/db/schema/raw-events/evolution-webhook-events.ts`
  - `src/db/schema/raw-events/uazapi-webhook-events.ts`
  - `src/db/schema/raw-events/typebot-webhook-events.ts`

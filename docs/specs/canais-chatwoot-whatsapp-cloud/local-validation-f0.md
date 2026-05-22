# F0 - Validacao Local Controlada (sem webhook publico)

## Objetivo

Separar validacao em quatro trilhas independentes para evitar bloqueio cruzado:

- A) runtime minimo local
- B) base representativa minima
- C) replay local de payloads/eventos
- D) webhook real depois

## F0.1 - Runtime minimo

- Subir PostgreSQL + Redis + app + worker e estabilizar `/api/health`.
- Comandos-base:
  - `npm run db:wait`
  - `npm run db:create`
  - `npm run db:migrate`
  - `npm run db:seed`
  - `npm run dev`
  - `npm run worker:dev`
- Gate:
  - `GET /api/health` com `db=ok`, `redis=ok`, `worker=ok`.
  - `npm run worker:readiness` retornando `Worker ready.`

## F0.2 - Dados representativos minimos

- Adicionar seed/fixture minima de conversa para validar prechecks e fluxo de leitura:
  - ao menos 1 tenant com:
    - 1 `evolution_instance`
    - 1 `uazapi_instance`
    - >= 2 `conversations` (1 por origem)
    - >= 4 `conversation_messages`
- Critico:
  - nao usar dados reais sensiveis.
  - manter idempotente (upsert/chaves deterministicas).

## F0.3 - Replay local

- Validar ingestao sem endpoint publico:
  - fixtures JSON versionadas em `scripts/fixtures/`.
  - runner de replay local em `scripts/replay/` para:
    - chamar parse/ingest local quando modulo existir; ou
    - inserir raw event controlado + enfileirar job correspondente.
- Gate:
  - raw event gravado;
  - job processado;
  - conversa/mensagem atualizadas;
  - sem crescimento anormal de DLQ.

## F0.4 - Webhook real depois

- Somente apos F0.1 + F0.2 + F0.3 estabilizados:
  - abrir endpoint publico
  - validar assinatura/replay/rate-limit
  - executar smoke de webhook real com baixa carga.

## Fora de escopo (agora)

- UI nova
- refactor de arquitetura
- troca de fila
- webhook publico como dependencia para validar logica interna

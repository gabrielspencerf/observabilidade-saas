# Frontend Data Layer incremental

Objetivo: reduzir `fetch` ad hoc sem refatoração total.

## Passo implementado

- Novo cliente compartilhado:
  - `src/features/shared/api/dashboard-api-client.ts`
- Primeiro módulo migrado:
  - `src/features/vysen-chat/api/chat-client.ts`
  - `src/features/vysen-chat/use-vysen-chat.ts`

## Padrão adotado

- Feature mantém seu `chat-client`.
- Transporte HTTP fica em camada compartilhada.
- Cliente interpreta envelope `{ ok, data/error }` e retorna erro tipado.

## Critério para próximas migrações

Migrar primeiro domínios com maior churn:
1. conversas
2. leads
3. integrações
4. notificações

## Regra prática

- Nova feature não deve usar `fetch` cru dentro do componente.
- Criar client da feature + usar `dashboard-api-client`.

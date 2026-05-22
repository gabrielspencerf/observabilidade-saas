# Agno + Vysen

## Objetivo

Adicionar uma infraestrutura de sessao, memoria e workflow para a Vysen sem substituir o dominio principal do produto.

O CRM, as conversas, os leads e as integrações continuam pertencendo ao schema atual da aplicação.
Agno entra como camada de runtime do copiloto.

## Problema atual

Hoje a Vysen combina:

- histórico recente de conversa
- contexto selecionado na UI
- resumos curtos gerados no frontend
- fallback local no backend

Isso funciona, mas tem limitações:

- memória principal ainda muito dependente de `localStorage`
- resumo de thread simples demais
- compactação por corte de caracteres, não por resumo semântico consistente
- falta de workflow formal para sumarização, extração de memória e otimização
- pouca observabilidade de sessão do copiloto

## Modelo recomendado com Agno

### 1. Session

Cada conversa da Vysen vira uma `session_id` persistida no backend.

Mapeamento sugerido:

- `tenant_id`: tenant atual do dashboard
- `user_id`: usuário autenticado
- `session_id`: thread da Vysen
- `run_id`: uma pergunta + resposta

### 2. Session Summary

Agno deve manter um resumo incremental por sessão.

Padrão recomendado:

- `enable_session_summaries=True`
- `add_session_summary_to_context=True`
- `add_history_to_context=True`
- `num_history_runs=2` ou `3`

### 3. Memory

Memória não deve ser o histórico bruto.

Mapeamento recomendado:

- `conversation`: contexto clicado ou explicitamente salvo
- `operation`: resumos úteis de outras conversas
- `tenant`: fatos duráveis sobre a operação do cliente
- `user`: preferências de uso do operador

### 4. Workflow

Workflows assíncronos devem cuidar de:

- resumo de sessão
- extração de memórias
- otimização de memórias
- fallback e reprocessamento

## Limite de responsabilidade

Agno não vira fonte primária do CRM.

Agno deve armazenar:

- sessão do copiloto
- memória do copiloto
- summaries e runs

A aplicação continua dona de:

- `conversations`
- `conversation_messages`
- `leads`
- `opportunities`
- integrações
- observabilidade operacional

## Infraestrutura incremental

### Fase 1

- feature flag `VYSEN_AGNO_ENABLED`
- provider local e provider Agno
- contrato server-side para sessão e workflow

### Fase 2

- serviço Agno separado
- Postgres dedicado ou tabelas dedicadas no Postgres atual
- endpoints de sessão/contexto/workflow

### Fase 3

- uso de summaries oficiais no contexto do copilot
- uso de memories otimizadas
- workflow assíncrono de compactação

## Contrato implementado nesta etapa

Arquivos:

- `src/server/vysen/runtime/types.ts`
- `src/server/vysen/runtime/provider.ts`
- `src/server/vysen/runtime/config.ts`
- `src/server/vysen/runtime/local-provider.ts`
- `src/server/vysen/runtime/agno-provider.ts`
- `src/server/vysen/runtime/index.ts`

## Próximo passo recomendado

Implementar o serviço Agno como processo separado com:

- rota `POST /sessions/context`
- rota `POST /workflows/run`
- persistência Postgres
- summaries habilitadas
- memory optimization programada

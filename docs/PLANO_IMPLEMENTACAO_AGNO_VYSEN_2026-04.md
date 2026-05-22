# Plano de Implementacao Agno + Vysen

## Etapa 1. Base de contrato

Status: implementada

- adicionar feature flag de runtime
- criar provider local
- criar provider Agno por HTTP
- definir tipos de session, memory e workflow

## Etapa 2. Bridge do copilot

Status: pendente

- usar `getVysenRuntimeProvider()` dentro do fluxo do copilot
- enriquecer prompt com `session summary` e `memories` vindas do runtime
- manter fallback local como contingência

## Etapa 3. Serviço Agno

Status: pendente

- criar app Python separado para Agno
- configurar `PostgresDb`
- ativar `enable_session_summaries`
- ativar `add_session_summary_to_context`
- ativar `add_history_to_context`
- expor endpoints HTTP consumidos pela app principal

## Etapa 4. Workflow assíncrono

Status: pendente

- workflow `session-summary`
- workflow `memory-extraction`
- workflow `memory-optimization`

## Etapa 5. Observabilidade

Status: pendente

- health do serviço Agno
- latência por endpoint
- erros por workflow
- contagem de sessões e memórias

## Etapa 6. UX da memória

Status: pendente

- substituir resumo local simples por session summary persistida
- separar "contexto da conversa" de "memória operacional"
- mostrar quando a resposta veio do runtime local ou do runtime Agno

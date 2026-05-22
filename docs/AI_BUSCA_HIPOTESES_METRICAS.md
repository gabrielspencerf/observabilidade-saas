# AI e busca - hipóteses antes de expansão

Objetivo: evitar adoção prematura de complexidade (vetor, agentes, indexadores) sem ganho comprovado.

## Hipóteses obrigatórias antes de ampliar stack

1. **Hipótese de valor**
   - Ex.: reduzir tempo médio de resposta de operador em X%.
2. **Hipótese de qualidade**
   - Ex.: aumentar acurácia de classificação em Y pontos.
3. **Hipótese de custo**
   - Ex.: custo por interação abaixo de limite acordado.

## Métricas mínimas por ciclo

- taxa de acerto funcional
- latência p50/p95
- custo por execução
- taxa de fallback/manual override
- impacto operacional (tempo salvo ou conversão)

## Gate de evolução

- Sem baseline de métrica: não ampliar arquitetura.
- Sem revisão de risco (dados sensíveis): não promover para produção.
- Sem plano de rollback: não ativar em massa.

## Escopo atual recomendado

- Manter IA como capability focada (Vysen), com evolução incremental.
- Tratar busca avançada apenas quando filtros e volume justificarem.

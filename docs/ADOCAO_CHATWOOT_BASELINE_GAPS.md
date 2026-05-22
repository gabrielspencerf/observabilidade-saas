# Adoção Chatwoot - baseline e gaps do SaaS

Data: 2026-04-26
Referência principal: `docs/chatwoot_analise_estrutural_saas.md`

## 1) Diagnóstico por camada

### Domínio e aplicação
- **Padrão sólido do Chatwoot**
  - Tenant-first explícito na camada de negócio.
  - Contratos de evento orientados a domínio.
- **Dívida técnica do Chatwoot**
  - Acoplamento em callbacks de modelo e histórico de transições longas.
- **Situação atual deste SaaS**
  - Base de tenant e RBAC já consolidada em `src/server/dashboard/api-auth.ts`.
  - Fluxos críticos ainda espalhados entre rotas e serviços sem contrato único de resposta.
- **Ação adotada agora**
  - Contrato de resposta padronizado (`src/server/http/api-contract.ts`) e aplicação inicial em rotas de dashboard.

### Banco e isolamento
- **Padrão sólido do Chatwoot**
  - Tenant explícito + isolamento robusto por camada de dados.
- **Dívida técnica do Chatwoot**
  - Flexibilidade alta pode virar entropia sem contrato.
- **Situação atual deste SaaS**
  - RLS já presente (`src/db/migrations/0016_security_rls_tenant_policies.sql`).
  - Baseline de segurança em produção não estava bloqueado por startup guard.
- **Ação adotada agora**
  - Baseline obrigatório em produção (`assertProductionSecurityBaseline`).

### Filas e async
- **Padrão sólido do Chatwoot**
  - Filas separadas por criticidade/SLO e DLQ tratada como primeira classe.
- **Dívida técnica do Chatwoot**
  - Taxonomia de filas pode crescer sem governança.
- **Situação atual deste SaaS**
  - Já existem filas por domínio e DLQ (`src/workers/queue/types.ts`).
  - Política de retry ainda era global.
- **Ação adotada agora**
  - Política por tipo de job (`src/workers/queue/policy.ts`) + uso no worker.

### APIs, webhooks e integrações
- **Padrão sólido do Chatwoot**
  - Contratos explícitos entre API interna, API operacional e webhooks.
  - Assinatura, replay protection e payload estável.
- **Dívida técnica do Chatwoot**
  - Regressão de payload quando contratos não são versionados cedo.
- **Situação atual deste SaaS**
  - Segurança já presente (assinatura e replay), mas sem header de contrato comum.
- **Ação adotada agora**
  - Headers de contrato/versionamento/idempotência em rotas de webhook.

### Frontend
- **Padrão sólido do Chatwoot**
  - Migração incremental com camada de compatibilidade, sem big bang.
- **Dívida técnica do Chatwoot**
  - Estado híbrido prolongado.
- **Situação atual deste SaaS**
  - Fetch ad hoc em features de maior churn (Vysen).
- **Ação adotada agora**
  - Cliente de API compartilhado para módulo de chat (`src/features/shared/api/dashboard-api-client.ts`).

### Governança técnica
- **Padrão sólido do Chatwoot**
  - Disciplina operacional e ciclo de release previsível.
- **Dívida técnica do Chatwoot**
  - Drift entre docs e código.
- **Situação atual deste SaaS**
  - CI forte, mas `latest` em toda build aumentava risco operacional.
  - `ci:verify` não rodava `npm test`.
- **Ação adotada agora**
  - Remoção de tag `latest` automática no workflow.
  - Inclusão de `npm test` no `ci:verify`.

## 2) O que adotar, adaptar, descartar

### Adotar já
- Guardrails obrigatórios de produção para RLS + CSRF.
- Retry/backoff por criticidade de fila.
- Envelope padrão de API e versionamento de contrato em webhook.

### Adaptar depois
- Eventos de domínio mais explícitos por fluxo (lead, conversa, follow-up, ads).
- Observabilidade com métricas agregadas por fila/SLO no storage analítico.
- Expansão da camada de cliente frontend para outras áreas além de Vysen.

### Não copiar
- Callback-heavy como padrão arquitetural.
- Multiplicação de integrações e dependências sem ROI comprovado.
- Complexidade de omnichannel e IA antes de hipótese de valor validada.

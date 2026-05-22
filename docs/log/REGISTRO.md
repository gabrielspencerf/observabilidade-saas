# Registro de erros, falhas e soluÃ§Ãµes

Itens mais recentes no topo. Formato: **Contexto** â†’ **Erro** â†’ **Causa** â†’ **SoluÃ§Ã£o**.

---
## 1.22 Base de arquitetura Agno + Vysen - 2026-04-25

- **Contexto:** Preparar uma infraestrutura melhor para sessão, memória, contexto e workflows do copiloto sem substituir o domínio atual da aplicação.
- **Mudança implementada:**
  - documentação nova:
    - `docs/AGNO_VYSEN_ARQUITETURA_2026-04.md`
    - `docs/PLANO_IMPLEMENTACAO_AGNO_VYSEN_2026-04.md`
  - camada de abstração nova:
    - `src/server/vysen/runtime/types.ts`
    - `src/server/vysen/runtime/provider.ts`
    - `src/server/vysen/runtime/config.ts`
    - `src/server/vysen/runtime/local-provider.ts`
    - `src/server/vysen/runtime/agno-provider.ts`
    - `src/server/vysen/runtime/index.ts`
  - `README.md` e `.env.example` atualizados com as variáveis planejadas do runtime Agno
- **Objetivo técnico:** separar a futura infraestrutura do copiloto em três blocos:
  - sessão persistida
  - memória durável
  - workflows assíncronos
  sem acoplar isso ao CRM principal.
- **Validação executada:** `npm run typecheck`

---
## Fechamento B.3 local + gate B.5 inicial (Chatwoot / WhatsApp Cloud) - 2026-04-24

- **Hipotese:** a implementacao real de B.3 ja existia no codigo, mas faltava evidencia executavel para afirmar go/no-go local e alinhar a documentacao.
- **Mudanca implementada:**
  - novo `scripts/smoke-channels.ts` para validar localmente o pipeline:
    - raw event Chatwoot / WhatsApp Cloud
    - processor
    - criacao de `conversations` / `conversation_messages`
    - dedup de replay
    - contato resolvido/criado
    - `processed_at` / `processing_error`
    - enqueue unico de `classify_conversation`
    - leitura de dashboard (`instanceDisplay`) em listagem e detalhe
  - `scripts/smoke-api.ts` expandido para cobrir guardrails dos canais novos:
    - `x-chatwoot-signature`
    - `x-hub-signature-256`
    - hub verification GET
    - anti-replay
    - dedup de raw event
    - `env.metaAppSecret`
  - `scripts/smoke-worker.ts` expandido para exigir filas/loops de `chatwoot` e `whatsapp-cloud`
  - `scripts/db-seed-synthetic-conversations.ts` consolidado com `chatwoot_accounts` e `whatsapp_cloud_numbers` no resumo
  - `README.md`, `.env.example`, `docs/specs/.../plan.md` e `validation.md` atualizados para refletir o estado real
- **Comandos executados:**
  - `npm run typecheck`
  - `npm run smoke:api`
  - `npm run smoke:worker`
  - `npm run smoke:channels`
- **Resultados finais:**
  - `typecheck`: OK
  - `smoke:api`: OK
  - `smoke:worker`: OK
  - `smoke:channels`: OK
    - tenant validado: `tenant-teste`
    - Chatwoot:
      - `conversationCreated=true`
      - `messageDedup=true`
      - `privateIgnored=true`
      - `classificationEnqueuedOnce=true`
      - `processingErrorHandled=true`
    - WhatsApp Cloud:
      - `conversationCreated=true`
      - `messageDedup=true`
      - `statusesAcknowledged=true`
      - `classificationEnqueuedOnce=true`
      - `processingErrorHandled=true`
    - Dashboard:
      - `labelsValidated=true`
- **Decisao local:** B.3 pode ser considerado **implementado e validado localmente**.
- **Proximo passo logico:**
  - repetir precheck `0019` em staging/prod com dados reais
  - validar `META_APP_SECRET` e credenciais Chatwoot reais
  - observar DLQ / `processing_failures` antes de promover rollout

---
## Precheck B.0.1 â€” ValidaÃ§Ã£o de legado (migration canais nativos) â€” 2026-04-24

- **Ambiente:** local (`localhost:5432/app`) â€” base com seed sintÃ©tico (2 conversas representativas)
- **Script executado:** `scripts/precheck-migration.ts`
- **Resultado por check:**

| Check | DescriÃ§Ã£o | Resultado | DecisÃ£o |
|-------|-----------|-----------|---------|
| 3.1.1 | Origem invÃ¡lida (ambas ou nenhuma FK) | 0 linhas | nÃ£o bloqueia |
| 3.1.2 | DistribuiÃ§Ã£o de origem | 1 evolution + 1 uazapi | ok |
| 3.2.1 | Duplicatas Evolution | 0 linhas | nÃ£o bloqueia |
| 3.2.2 | Duplicatas UAZAPI | 0 linhas | nÃ£o bloqueia |
| 3.3.1 | `external_id` nulo/vazio | 0 linhas | nÃ£o bloqueia |
| 3.3.2 | Tamanho de `external_id` | min=22, max=22, avg=22 | consistente |
| 3.4.1 | Orphan FK Evolution | 0 linhas | nÃ£o bloqueia |
| 3.4.2 | Orphan FK UAZAPI | 0 linhas | nÃ£o bloqueia |
| 3.5.1 | Constraints de `conversations` | 7 constraints (CHECK + FKs esperadas) | coerente |
| 3.5.2 | Ãndices de `conversations` | 8 Ã­ndices (Ãºnicos parciais por canal ok) | coerente |

- **ObservaÃ§Ã£o crÃ­tica:** base local com apenas 2 conversas (seed sintÃ©tico). Conforme critÃ©rio do `migration-precheck.md` Â§4, ambiente com volume representativo de dados reais Ã© prÃ©-condiÃ§Ã£o para aprovaÃ§Ã£o definitiva. Este resultado Ã© **inconclusivo para liberar migration em staging/prod**, mas confirma integridade estrutural do schema e ausÃªncia de drift de constraints.
- **DecisÃ£o parcial:** `apto para migration` em ambiente local isolado. **Repetir em staging/prod antes de aplicar em produÃ§Ã£o.**
- **Constraints e Ã­ndices verificados:**
  - `conversations_instance_check` presente e correta (exatamente uma origem)
  - `conversations_tenant_evolution_external_unique` (parcial, apenas evolution)
  - `conversations_tenant_uazapi_external_unique` (parcial, apenas uazapi)
  - Sem drift inesperado de FK ou Ã­ndice Ã³rfÃ£o

---

## Fechamento F0.1/F0.2 (runtime local + seed sintetico minima) â€” 2026-04-16

- **Causa raiz identificada (runtime):**
  - `worker stale` porque heartbeat e consumo de filas (`BRPOP`) usavam a mesma conexÃ£o Redis no worker.
  - efeito: comando bloqueante atrasava escrita de heartbeat e derrubava `worker:readiness` e `/api/health`.
  - havia tambÃ©m processos duplicados de worker em paralelo, escrevendo heartbeats com timestamps divergentes.
- **Causa raiz identificada (governanÃ§a local):**
  - drift de banco alvo local entre docs/compose (`vysen`) e `.env` (`app`), gerando setup inconsistente.
- **CorreÃ§Ãµes aplicadas:**
  - `src/workers/runner.ts`:
    - heartbeat passou para conexÃ£o Redis dedicada (`heartbeatRedis`);
    - encerramento (`SIGINT`/`SIGTERM`) atualiza `quit` para ambas conexÃµes.
  - operaÃ§Ã£o local:
    - processos duplicados de worker foram encerrados e o worker foi reiniciado em instÃ¢ncia Ãºnica.
  - `src/db/migrations/0014_vysen_knowledge_pgvector.sql`:
    - fallback para ambiente sem extensÃ£o `vector`, evitando bloqueio completo de `db:migrate` no setup local.
  - `scripts/create-db.ts`:
    - `db:create` ficou idempotente mesmo com mensagem local em PT-BR (`jÃ¡ existe`) e cÃ³digo SQL `42P04`.
  - `docker-compose.dev.yml`:
    - `POSTGRES_DB` alinhado para `app`.
  - `.env`:
    - `NEXT_PUBLIC_APP_URL` ajustado para local (`http://localhost:3000`), removendo dependÃªncia de domÃ­nio externo.
  - `scripts/db-seed-synthetic-conversations.ts` (novo):
    - seed idempotente de 1 `evolution_instance`, 1 `uazapi_instance`, 2 `conversations`, 4 `conversation_messages`.
  - `package.json`:
    - novo comando `db:seed:synthetic-conversations`.
  - `docs/GETTING_STARTED.md` e `docs/POSTGRESQL_WINDOWS.md`:
    - exemplos/fluxo alinhados para banco local `app` + seed sintÃ©tico mÃ­nimo.
- **Comandos executados (etapa):**
  - `npm run db:wait`
  - `npm run db:create`
  - `npm run db:migrate`
  - `npm run db:seed`
  - `npm run db:seed:synthetic-conversations`
  - `npm run worker:readiness`
  - `GET http://127.0.0.1:3000/api/health`
- **Resultados finais:**
  - `db:wait`: OK
  - `db:create`: OK (idempotente: banco jÃ¡ existe)
  - `db:migrate`: OK (com notice explÃ­cito de fallback sem `vector` no ambiente local)
  - `db:seed`: OK
  - `db:seed:synthetic-conversations`: OK (`conversations=2`, `messages=4`)
  - `worker:readiness`: OK (`Worker ready.`)
  - `/api/health`: OK (HTTP 200; `db=ok`, `redis=ok`, `worker=ok`)
- **PendÃªncias propositalmente adiadas:**
  - webhook real (Chatwoot/WhatsApp)
  - endpoint pÃºblico/domÃ­nio
  - migration de novos canais
  - replay avanÃ§ado de payloads
  - refactor/UI/arquitetura
- **ObservaÃ§Ã£o importante (migrate local):**
  - ambiente local segue sem extensÃ£o `vector`; o fallback da migration 0014 mantÃ©m setup local funcional sem habilitar embeddings vetoriais.
- **Ponto de parada seguro:**
  - ambiente local estÃ¡ funcional para validaÃ§Ã£o interna bÃ¡sica de conversas/mensagens sem webhook pÃºblico.

---

## Execucao Fase B.0.1 (tentativa com exigencia de representatividade) â€” 2026-04-16

- **Objetivo da tentativa:** repetir prechecks somente se o ambiente tivesse representatividade minima de conversas.
- **Ambiente confirmado:**
  - `host=localhost`
  - `port=5432`
  - `database=app`
- **Volume inicial (pre-check obrigatorio):**
  - `conversations=0`
  - `tenants=2`
  - `evolution_instances=1`
  - `uazapi_instances=2`
- **Decisao do gate de representatividade:**
  - como `conversations=0`, os prechecks detalhados **nao foram executados** nesta tentativa.
- **Resultado consolidado:**
  - execucao **inconclusiva** para legado real de conversas;
  - status da migration: **bloqueado**.
- **Proximo passo recomendado:**
  - apontar `DATABASE_URL` para staging/producao com `conversations > 0` e repetir exatamente o protocolo.

---

## Execucao Fase B.0.1 (prechecks executados no shell atual) â€” 2026-04-16

- **Hipotese:** executar prechecks no ambiente conectado e decidir go/no-go de migration sem aplicar DDL.
- **Ambiente confirmado no shell atual:**
  - `DATABASE_URL` carregada do `.env` local;
  - alvo: `host=localhost`, `port=5432`, `database=app`;
  - conectividade: `npm run db:wait` -> `PostgreSQL pronto (tentativa 1/60)`.
- **Resultado por check (ordem do protocolo):**
  - `3.1.1` sanidade origem (invalid_both_or_none):
    - linhas: `0`
    - risco: nenhum encontrado
    - bloqueia migration: `nao`
  - `3.1.2` distribuicao de origem:
    - linhas de agregacao: `0` buckets
    - risco: ausencia total de conversas para avaliar distribuicao
    - bloqueia migration: `sim` (inconclusivo por representatividade)
  - `3.2.1` duplicata Evolution:
    - linhas: `0`
    - risco: nenhum encontrado
    - bloqueia migration: `nao`
  - `3.2.2` duplicata UAZAPI:
    - linhas: `0`
    - risco: nenhum encontrado
    - bloqueia migration: `nao`
  - `3.3.1` `external_id` nulo/vazio:
    - linhas: `0`
    - risco: nenhum encontrado
    - bloqueia migration: `nao`
  - `3.3.2` distribuicao tamanho `external_id`:
    - linhas de agregacao: `1` (`min/max/avg = null`)
    - risco: dataset sem conversas
    - bloqueia migration: `sim` (inconclusivo por representatividade)
  - `3.4.1` orphan FK Evolution:
    - linhas: `0`
    - risco: nenhum encontrado
    - bloqueia migration: `nao`
  - `3.4.2` orphan FK UAZAPI:
    - linhas: `0`
    - risco: nenhum encontrado
    - bloqueia migration: `nao`
  - `3.5.1` inventario de constraints:
    - linhas: `7`
    - evidencias-chave:
      - `conversations_instance_check` presente
      - FKs de `evolution_instance_id` e `uazapi_instance_id` presentes
    - bloqueia migration: `nao`
  - `3.5.2` inventario de indices:
    - linhas: `8`
    - evidencias-chave:
      - `conversations_tenant_evolution_external_unique` presente
      - `conversations_tenant_uazapi_external_unique` presente
    - bloqueia migration: `nao`
- **Check complementar de representatividade (volume):**
  - `conversations = 0`
  - `tenants = 2`
  - `evolution_instances = 1`
  - `uazapi_instances = 2`
- **Decisao final desta execucao:** **bloqueado**.
  - motivo: apesar de nao haver inconsistencias estruturais detectadas, o ambiente executado nao possui conversas para validar legado real da tabela foco (`conversations`), logo o resultado e inconclusivo para liberar migration.
- **Proximo passo logico:**
  - repetir o mesmo protocolo em staging com dados reais de conversas (`conversations > 0`) e registrar novo parecer objetivo de go/no-go.

---

## Execucao Fase B.0.1 (prechecks de legado em ambiente real) â€” 2026-04-16

- **Hipotese:** a migration de canais nativos so pode ser liberada apos prechecks de legado executados em base com dados reais.
- **Tentativa de execucao no ambiente atual:**
  - comando: `npm run db:wait`
  - resultado: `wait-for-db: DATABASE_URL nÃ£o definida`
  - evidencia: ambiente local atual sem `.env` operacional e sem `DATABASE_URL` exportada.
- **Conclusao operacional:**
  - prechecks **nao executados** neste ambiente;
  - decisao desta etapa: **bloqueado** para liberar migration agora.
- **Mudanca documental aplicada para destravar execucao manual segura:**
  - criado `docs/specs/canais-chatwoot-whatsapp-cloud/precheck-execution.md` com:
    - ordem por criticidade,
    - criterio de bloqueio por check,
    - protocolo de registro auditavel.
  - atualizado `docs/specs/canais-chatwoot-whatsapp-cloud/migration-precheck.md` com referencia ao guia operacional.
  - atualizado `docs/specs/canais-chatwoot-whatsapp-cloud/validation.md` para incluir validacao do novo guia.
- **Risco residual:**
  - sem execucao dos checks em staging/prod, permanece incerteza de legado para a nova constraint de origem unica.
- **Proximo passo logico:**
  - executar o protocolo de `precheck-execution.md` em staging com `DATABASE_URL` valido e registrar resultado por check neste `REGISTRO.md`.

---

## Execucao Fase B.0 (design controlado da migration de canais nativos) â€” 2026-04-16

- **Hipotese:** antes de implementar Chatwoot/WhatsApp Cloud, e necessario desenhar migration de baixo risco com prechecks de legado para evitar quebra de constraint e drift SQL x schema TS.
- **Mudanca implementada (somente documental):**
  - criado `docs/specs/canais-chatwoot-whatsapp-cloud/migration-design.md` com:
    - diagnostico do estado atual de `conversations`,
    - proposta de ordem segura de statements para migration futura,
    - riscos reais e bloqueios obrigatorios.
  - criado `docs/specs/canais-chatwoot-whatsapp-cloud/migration-precheck.md` com:
    - queries de legado (somente leitura),
    - criterio objetivo de bloqueio/go-no-go,
    - evidencia minima para aprovar pre-migration.
  - atualizado `docs/specs/canais-chatwoot-whatsapp-cloud/plan.md` e `validation.md` para incluir gate formal da Fase B.0.
- **Comandos executados:**
  - sem comandos de migration/schema/runtime.
- **Resultado:**
  - projeto ficou pronto para validar legado antes da migration;
  - nenhuma alteracao em schema, migration, webhook, worker ou UI foi executada.
- **Risco residual:**
  - prechecks ainda precisam ser executados em ambiente com dados reais (staging/prod) para liberar implementacao da migration.
- **Proximo passo logico:**
  - executar `migration-precheck.md` em staging, registrar evidencias e decidir go/no-go da migration.

---

## Template de registro â€” Janela controlada RLS em staging

Usar este bloco no dia da execuÃ§Ã£o real (copiar/colar e preencher).

- **Timestamp de ativaÃ§Ã£o (T0):**
- **Ambiente:** staging
- **ConfiguraÃ§Ã£o aplicada:**
  - `SECURITY_ENFORCE_RLS=true`
  - `WORKER_DB_ACCESS_MODE=bypass`
- **ReinÃ­cio executado:** app [ ] / worker [ ]
- **Health T0 (`GET /api/health`):**
  - `ok=`
  - `db=`
  - `redis=`
  - `worker=`
  - `workerHeartbeatAgeMs=`
  - `workerLastHeartbeatAt=`
- **Baseline T0 (Observability):**
  - `queueDepthTotal=`
  - `dlqDepthTotal=`
- **`processing_failures` T0 (30 min):**
  - resumo por `job_type`:

- **Coleta T+15min:**
  - health:
  - queue/depth + dlq:
  - `processing_failures`:
  - observaÃ§Ãµes:

- **Coleta T+30min:**
  - health:
  - queue/depth + dlq:
  - `processing_failures`:
  - observaÃ§Ãµes:

- **CritÃ©rio de sucesso atendido?** [ ] sim [ ] nÃ£o
- **CritÃ©rio de rollback acionado?** [ ] sim [ ] nÃ£o
- **Se rollback executado:**
  - timestamp:
  - flags revertidas:
  - validaÃ§Ã£o pÃ³s-rollback:
- **DecisÃ£o final:** [ ] GO produÃ§Ã£o [ ] NO-GO produÃ§Ã£o
- **ResponsÃ¡vel pela decisÃ£o:**

---

## Execucao F3.3/F3.4 (staging-readiness + evidencia operacional) â€” 2026-04-16

- **Hipotese:** com `SECURITY_ENFORCE_RLS=true`, o ambiente staging precisa de trilha de go/no-go objetiva para evitar ativacao sem criterio mensuravel.
- **Mudanca implementada:**
  - `src/workers/runner.ts`: adicionado log de startup do estado de rollout (`securityEnforceRls` + `workerDbAccessMode`) e warning explicito para combinacao de risco (`RLS=true` com `WORKER_DB_ACCESS_MODE=off`).
  - `docs/SECURITY_ACCEPTANCE_CHECKLIST.md`: adicionada secao de **Go/No-Go de staging (RLS)** com criterios objetivos de observacao.
  - `docs/DEPLOY_VPS.md`: adicionada trilha operacional curta para staging (ativacao, validacao, observacao, evidencias e rollback).
  - `.env.example`: perfil recomendado de staging inicial (`SECURITY_ENFORCE_RLS=true` + `WORKER_DB_ACCESS_MODE=bypass`).
- **Comandos executados:**
  - `npm run typecheck`
  - `npm run smoke:web`
  - `npm run smoke:api`
  - `npm run smoke:worker`
  - `npm run ci:verify`
- **Resultado:**
  - comandos concluÃ­dos com sucesso no estado local;
  - warnings de lint permanecem pre-existentes e nao bloqueantes.
- **Criterio de sucesso em staging:**
  - health estavel na janela de observacao;
  - sem crescimento anormal de DLQ;
  - sem pico regressivo em `processing_failures`;
  - decisao explicita de go/no-go registrada.
- **Criterio de rollback:**
  - ao detectar regressao operacional relevante apos ativacao, voltar `SECURITY_ENFORCE_RLS=false`, reiniciar app/worker e revalidar health + fluxo minimo webhook/sync.
- **Risco residual:**
  - ainda depende de execucao real em staging para fechar evidencia de comportamento sob carga real de jobs.
- **Proximo passo logico:**
  - executar a janela controlada em staging e registrar evidencias reais (timestamps, logs-chave e decisao final) neste mesmo registro.

---

## Execucao F3.1-F3.4 (rollout RLS por ambiente + guardrail no worker) â€” 2026-04-16

- **Hipotese:** ao ligar `SECURITY_ENFORCE_RLS=true`, o maior risco imediato de quebra e no worker (jobs sem contexto explicito de acesso), nao na camada de auth/dashboard que ja define `setDbAccessContext`.
- **Mudanca implementada:**
  - `src/config/env.ts`: adicionada flag `WORKER_DB_ACCESS_MODE` (`off | bypass | tenant`).
  - `src/workers/runner.ts`: aplicado contexto de acesso por job (`setDbAccessContext`) com reset seguro (`resetDbAccessContext`) em bloco `finally`.
  - `.env.example`: documentado `WORKER_DB_ACCESS_MODE` com recomendacao de rollout inicial em `bypass`.
  - `docs/SECURITY_ACCEPTANCE_CHECKLIST.md`: adicionados checks operacionais de worker + etapas de rollout por ambiente e criterio de rollback.
  - `docs/DEPLOY_VPS.md`: adicionada orientacao objetiva de rollout dev/staging/prod com rollback minimo.
- **Comandos executados:**
  - `npm run typecheck`
  - `npm run smoke:web`
  - `npm run smoke:api`
  - `npm run smoke:worker`
  - `npm run ci:verify`
- **Resultado:**
  - todos os comandos acima: **OK**;
  - `ci:verify` manteve warnings de lint pre-existentes (sem erro bloqueante).
- **Risco residual:**
  - em `WORKER_DB_ACCESS_MODE=tenant`, jobs globais (sem `tenantId` no payload) entram em fallback `bypass` para preservar compatibilidade; isso e seguro para rollout, mas nao e isolamento maximo.
- **Criterio de rollback (fase RLS):**
  - se apos ativar RLS houver aumento anormal de DLQ, falhas de sync/followup ou erros persistentes de autorizacao/tenant, voltar `SECURITY_ENFORCE_RLS=false` e manter `WORKER_DB_ACCESS_MODE=off` ate reavaliacao.

---

## Execucao F5 (refactor cirurgico - rastreabilidade de falhas) â€” 2026-04-16

- **Contexto:** `processing_failures` existia no schema e leitura admin, mas sem alimentacao robusta no fluxo de DLQ.
- **Acoes executadas:**
  - ajustado `src/workers/runner.ts` para registrar falhas finais de jobs em `processing_failures` ao enviar para DLQ;
  - incluido mapeamento minimo de `jobType`, `jobId`, `tenantId`, `retryCount`, `queue`, `deadLetterQueue` e `errorMessage`;
  - mantido comportamento atual de fila (sem troca de stack), apenas endurecendo observabilidade de falha.
- **Validacao executada:**
  - `npm run smoke:worker`: OK
  - `npm run typecheck`: OK
- **Ganho esperado:** melhoria de rastreabilidade operacional para analise de falhas recorrentes, sem refactor amplo de infraestrutura.

---

## Execucao F4 (templates spec-anchored) â€” 2026-04-16

- **Contexto:** Ativacao pratica do processo leve spec-anchored para mudancas novas.
- **Acoes executadas:**
  - criados templates curtos em `docs/templates/`:
    - `spec.md`
    - `plan.md`
    - `validation.md`
    - `adr.md`
- **Resultado:** repositÃ³rio passa a ter artefatos padrao para mudancas medias/grandes com foco em escopo, validacao e rastreabilidade.
- **Proximo passo recomendado:** usar os templates em um piloto real de mudanca media para fechar criterio de aceite de F4.

---

## Execucao F3 (observabilidade de fronteira) â€” 2026-04-16

- **Contexto:** Reducao de inconsistencia operacional entre visoes de fila no admin.
- **Acoes executadas:**
  - ampliado snapshot de `src/server/admin/observability.ts` para incluir todas as filas ativas do worker:
    - Meta Ads
    - Clarity
    - Follow-up Due
  - ampliado calculo de totais (`queueDepthTotal` e `dlqDepthTotal`) com todas as filas/DLQs.
  - atualizada UI de `src/app/(admin)/admin/observability/page.tsx` para exibir tambem Meta Ads, Clarity e Follow-up Due.
- **Validacao executada:**
  - `npm run smoke:web`: OK
  - `npm run smoke:api`: OK
  - `npm run smoke:worker`: OK
  - `npm run typecheck`: OK
- **Resultado:** leitura operacional de filas ficou mais consistente com o worker pipeline e com as filas reais em execucao.

---

## Execucao F2 (harness minimo) + fechamento pendencia F1 â€” 2026-04-16

- **Contexto:** Avanco de execucao do plano `docs/plano_f1_f5_governanca_vysen_v1_1.md` apos baseline inicial.
- **Acoes executadas:**
  - removido atalho de Admin do dashboard (alinhando codigo com regra normativa de nao exibir Admin no dashboard);
  - criados smokes minimos:
    - `scripts/smoke-web.ts`
    - `scripts/smoke-api.ts`
    - `scripts/smoke-worker.ts`
  - adicionados scripts oficiais no `package.json`:
    - `smoke:web`, `smoke:api`, `smoke:worker`, `ci:verify`;
  - atualizado workflow `.github/workflows/docker-image.yml` com job `verify` (lint + typecheck + build + smokes) como gate para build/push;
  - atualizado `README.md` com os novos comandos oficiais de validacao.
- **Validacao executada:**
  - `npm run smoke:web`: OK
  - `npm run smoke:api`: OK
  - `npm run smoke:worker`: OK
  - `npm run ci:verify`: OK (com warnings de lint pre-existentes, sem erro bloqueante)
- **Status de pendencias criticas:**
  - pendencia "link Admin no dashboard": **fechada**
  - CI gate minimo: **ativo**
  - smoke dos fluxos criticos (baseline inicial 0/5): **cobertura minima implantada**

---

## Execucao F1 (canonizacao + baseline) â€” 2026-04-16

- **Contexto:** Inicio de execucao do plano `docs/plano_f1_f5_governanca_vysen_v1_1.md` com foco em F1.
- **Acoes executadas:**
  - criada matriz de autoridade documental: `docs/MATRIZ_AUTORIDADE_DOCUMENTAL.md`;
  - alinhado `README.md` para refletir fila Redis com implementacao interna (removida mencao a BullMQ como runtime);
  - atualizada revisao estrutural de migracoes em `docs/db/REVISAO_ESTRUTURAL.md` (incluindo 0016, 0017, 0018);
  - corrigida descricao de filas em `docs/db/REVISAO_ESTRUTURAL.md` para o modelo real (`src/workers/queue`).
- **Baseline inicial registrado:**
  - contradicoes canonicas conhecidas: 1 aberta (regra de link Admin no dashboard vs comportamento atual de UI);
  - gates de CI minimos (`lint`, `typecheck`, `build`) no workflow oficial: nao totalmente ativos (workflow atual focado em build/push de imagem Docker);
  - cobertura smoke automatizada dos 5 fluxos criticos: 0/5;
  - pipeline minimo `ci:verify`: inexistente no momento;
  - inconsistencias conhecidas entre painel de observabilidade e worker pipeline: 1 (escopo de filas monitoradas diferente).
- **Pendencia aberta para proxima fase:** decisao oficial sobre regra de exposicao de link Admin no dashboard e posterior alinhamento codigo/documentacao.

---

## RevisÃ£o de documentaÃ§Ã£o e higiene para Git â€” 2026-03-20

- **Contexto:** Consolidar changelog, variÃ¡veis, seguranÃ§a e evitar vazamento de infra no repositÃ³rio.
- **AÃ§Ã£o:** Criado [docs/REVISAO_GERAL_2026-03.md](../REVISAO_GERAL_2026-03.md); atualizados `SECURITY_ENDPOINTS_MAP`, `RESUMO_PROJETO`, `GETTING_STARTED`; exemplos em `.env.example` e `stack.env.example` anonimizados (sem domÃ­nio/e-mail de cliente); fallback de `SMTP_FROM` no cÃ³digo alterado para endereÃ§o genÃ©rico; `.gitignore` ampliado para dumps/backups comuns.
- **ReferÃªncia:** checklist prÃ©-push e lista do que nÃ£o versionar no doc de revisÃ£o geral.

---

## 1. InicializaÃ§Ã£o da aplicaÃ§Ã£o (Next.js dev) â€” 2025-03-09

### 1.1 PowerShell: token `&&` invÃ¡lido

- **Contexto:** Executar `cd c:\...\APP && npm run dev` no terminal (PowerShell).
- **Erro:** `O token '&&' nÃ£o Ã© um separador de instruÃ§Ãµes vÃ¡lido nesta versÃ£o.`
- **Causa:** No PowerShell (versÃµes antigas ou padrÃ£o), `&&` nÃ£o Ã© operador de encadeamento de comandos.
- **SoluÃ§Ã£o:** Usar `;` no lugar de `&&`, ou rodar os comandos separados. Ex.: `Set-Location c:\Users\gabri\Desktop\APP; npm run dev`.

---

### 1.2 Comando `next` nÃ£o reconhecido

- **Contexto:** `npm run dev` (que chama `next dev`).
- **Erro:** `'next' nÃ£o Ã© reconhecido como um comando interno ou externo, um programa operÃ¡vel ou um arquivo em lotes.`
- **Causa:** O binÃ¡rio `next` em `node_modules/.bin` nÃ£o estÃ¡ no PATH no contexto em que o script roda (comum em alguns ambientes Windows/IDE).
- **SoluÃ§Ã£o:** Usar `npx next dev` para garantir que o Node resolva o binÃ¡rio do pacote instalado. Opcional: adicionar script no `package.json`, ex.: `"dev": "npx next dev"`.

---

### 1.3 Turbopack: workspace root inferido incorretamente

- **Contexto:** Next.js 16.1.6 com Turbopack (padrÃ£o em `next dev`).
- **Erro:** `Turbopack build failed ... Next.js inferred your workspace root, but it may not be correct. We couldn't find the Next.js package (next/package.json) from the project directory: C:\...\APP\src\app`
- **Causa:** O Turbopack estÃ¡ inferindo o diretÃ³rio de trabalho como `src/app` em vez da raiz do projeto, e a partir daÃ­ nÃ£o resolve `node_modules/next`.
- **SoluÃ§Ã£o (alternativa usada):** Rodar o dev com **Webpack** em vez de Turbopack: `npx next dev --webpack`. Script adicionado no `package.json`: `"dev:webpack": "next dev --webpack"`.  
  **SoluÃ§Ã£o (futura, quando suportada):** Configurar `turbopack.root` no `next.config` com o caminho absoluto da raiz do projeto (em Next 16 a chave Ã© de nÃ­vel superior; em versÃµes anteriores poderia estar em `experimental`).

---

### 1.4 Next.js instalando dependÃªncias ao rodar dev

- **Contexto:** Primeira execuÃ§Ã£o de `npx next dev --webpack`.
- **Mensagem:** `It looks like you're trying to use TypeScript but do not have the required package(s) installed. Installing dependencies (@types/react, @types/node, etc.)`
- **Causa:** Next.js detecta `tsconfig.json` e arquivos TypeScript; se faltar algum tipo em devDependencies, tenta instalar.
- **SoluÃ§Ã£o:** Deixar a instalaÃ§Ã£o concluir ou garantir que `npm install` jÃ¡ foi rodado na raiz do projeto antes de `npm run dev`/`dev:webpack`.

---

### 1.5 Flag `--webpack` nÃ£o existe no Next 15

- **Contexto:** Rodar `npm run dev:webpack` (script com `next dev --webpack`).
- **Erro:** `error: unknown option '--webpack'`
- **Causa:** No Next 15 o bundler padrÃ£o do `next dev` jÃ¡ Ã© Webpack; a flag `--webpack` existe no Next 16 (onde Turbopack passou a ser padrÃ£o). No projeto estÃ¡ instalado Next 15 (`^15.0.0`).
- **SoluÃ§Ã£o:** Usar apenas `npm run dev` (ou `npx next dev` com o next local). O script `dev:webpack` pode ser mantido para quando o projeto for atualizado para Next 16 e o Turbopack voltar a dar problema de root.

---

### 1.6 Porta 3000 em uso

### 1.18 Superadmin passou a ser fonte oficial para Vysen e Worker

- **Contexto:** Continuidade da migracao do namespace tecnico para `/superadmin`.
- **Situacao:** As telas de configuracao da Vysen e de Worker & dados deixaram de depender do arquivo legado do caminho `/admin/*` como fonte oficial.
- **Acao:** Extraidos os componentes compartilhados `src/features/superadmin/agent-config-page.tsx` e `src/features/superadmin/worker-pipeline-page.tsx`; as rotas `/superadmin/agent` e `/superadmin/worker-pipeline` passaram a usar esses componentes diretamente; as rotas legadas equivalentes em `/admin/*` foram convertidas em redirect. Durante a validacao, tambem foram corrigidos acessos tipados ao `WebhookContext` nos webhooks de Chatwoot, Evolution, Typebot, UAZAPI e WhatsApp Cloud. Validado com `npm run typecheck` e `npm run smoke:web`.

---

### 1.17 Redirecionamento inicial do legado tecnico para superadmin

- **Contexto:** Continuidade da separacao estrutural entre `admin` da empresa e `superadmin` tecnico.
- **Situacao:** As listagens principais de tenants e usuarios deixaram de depender do caminho legado `/admin/*` como entrada oficial. O namespace `/superadmin/*` passou a conter as paginas reais dessas superficies, e o legado foi convertido em redirect.
- **Acao:** Criadas paginas reais em `src/app/(superadmin)/superadmin/tenants/page.tsx` e `src/app/(superadmin)/superadmin/users/page.tsx`; convertidas as rotas legadas `src/app/(admin)/admin/tenants/page.tsx` e `src/app/(admin)/admin/users/page.tsx` em redirect para `/superadmin/*`. Validado com `npm run typecheck` e `npm run smoke:web`.

---

### 1.16 Separacao inicial entre admin da empresa e superadmin

- **Contexto:** Execucao da primeira fase do plano de UX estrutural para separar os contextos `admin`, `superadmin` e `dashboard`.
- **Situacao:** A navegacao e os layouts passaram a reconhecer duas superficies administrativas distintas: `/admin` para a empresa e `/superadmin` para a camada tecnica. O middleware tambem passou a proteger `/superadmin`.
- **Acao:** Criados os layouts e paginas-base de `admin` da empresa e `superadmin`, atualizados `sidebar-navigation`, `admin-shell`, `admin-sidebar`, `admin-mobile-header`, `scripts/smoke-web.ts` e aliases de portfolio em `src/server/admin/company-portfolio.ts`. Validado com `npm run typecheck` e `npm run smoke:web`.

---

### 1.15 Plano formal para revisao UX estrutural

- **Contexto:** Revisao consolidada da experiencia com base no codigo e no material visual reunido em `ux-all-prints/`.
- **Situacao:** A analise confirmou que o produto exige tres camadas distintas de UX e navegacao: `superadmin`, `admin` e `dashboard`. O estado atual ainda mistura a camada da empresa com o espaco tecnico.
- **Acao:** Criados os documentos [docs/REVISAO_UX_ESTRUTURAL_2026-04.md](../REVISAO_UX_ESTRUTURAL_2026-04.md) e [docs/PLANO_EXECUCAO_UX_SUPERADMIN_ADMIN_DASHBOARD_2026-04.md](../PLANO_EXECUCAO_UX_SUPERADMIN_ADMIN_DASHBOARD_2026-04.md) com achados, prioridades, fases de execucao, arquivos impactados e criterios de validacao.

---

# 1.19 Integrations e Observability oficiais em `/superadmin`

- **Contexto:** Continuidade da separação estrutural entre `admin`, `superadmin` e `dashboard`, removendo dependência residual do legado técnico em `/admin/*`.
- **Ação:** Extraídas páginas oficiais para `src/features/superadmin/integrations-page.tsx` e `src/features/superadmin/observability-page.tsx`. As rotas `src/app/(superadmin)/superadmin/integrations/page.tsx` e `src/app/(superadmin)/superadmin/observability/page.tsx` agora usam essas fontes oficiais. As rotas legadas `src/app/(admin)/admin/integrations/page.tsx` e `src/app/(admin)/admin/observability/page.tsx` foram convertidas em redirect para `/superadmin/*`.
- **Validação:** `npm run typecheck` passou apÃ³s a extraÃ§Ã£o.

---

# 1.20 Vysen mais leve e hierarquia mais clara no `superadmin`

- **Contexto:** Inicio da revisao visual da camada tecnica apos a separacao estrutural entre `admin` e `superadmin`.
- **Ação:** O launcher da Vysen em `src/components/vysen-bubble-chat.tsx` deixou de ser apenas uma bolha e virou um resumo tecnico compacto com KPIs e CTA unico. O conteudo de `src/components/vysen-admin-panel-content.tsx` passou a abrir com links de acao rapida e alertas mais legiveis. Tambem foi ajustado `src/components/admin-sidebar.tsx` para explicitar o papel da area e corrigir o destino do menu de perfil do `superadmin`, e `src/app/(superadmin)/superadmin/page.tsx` ganhou uma faixa inicial de prioridades tecnicas.
- **Validação:** `npm run typecheck` passou apos os ajustes.

---

# 1.21 Fallback local para a Vysen no dashboard sem OpenAI

- **Contexto:** No dashboard do cliente, pedir explicação ou resumo para a Vysen estava falhando com `500` quando a chave `OPENAI_API_KEY` não estava configurada ou a consulta externa falhava.
- **Ação:** `src/server/vysen/copilot.ts` agora gera uma resposta local de contingência com base nos dados do tenant/superadmin já disponíveis, em vez de lançar erro duro. O dock em `src/components/dashboard-vysen-chat-dock.tsx` também deixou de reciclar memórias vazias com `Sem resumo ainda.` como se fossem contexto real.
- **Validação:** `npm run typecheck` passou após a alteração.

---

- **Contexto:** Segunda execuÃ§Ã£o de `npm run dev` com outro processo jÃ¡ usando a porta 3000.
- **Comportamento:** Next.js avisa e usa a prÃ³xima disponÃ­vel: `Port 3000 is in use by process XXXXX, using available port 3001 instead.`
- **SoluÃ§Ã£o:** Nenhuma aÃ§Ã£o obrigatÃ³ria; acessar a app na porta indicada (ex.: http://localhost:3001). Para liberar a 3000, encerrar o processo que a estÃ¡ usando (Task Manager ou `Get-Process -Id 26152 | Stop-Process` no PowerShell).

---

### 1.9 Andamento: initdb falhou; script setup-local.ps1

- **Contexto:** Dar andamento ao setup com PostgreSQL.
- **SituaÃ§Ã£o:** BinÃ¡rios em `C:\Program Files\PostgreSQL\16\bin` existem; o diretÃ³rio `data` nÃ£o existe (instalaÃ§Ã£o via winget nÃ£o concluiu o assistente). Tentativa de `initdb` em pasta local (`pgdata`) falhou com erro `$libdir/dict_snowball` nÃ£o encontrado (instalaÃ§Ã£o incompleta).
- **AÃ§Ã£o:** Criado script **`scripts/setup-local.ps1`** que roda em sequÃªncia `db:create`, `db:migrate`, `db:seed` (usar quando o Postgres estiver rodando). Atualizado **docs/POSTGRESQL_WINDOWS.md** com seÃ§Ã£o â€œSe os binÃ¡rios existem mas o serviÃ§o nÃ£o apareceâ€ (reinstalar/concluir assistente) e uso do `setup-local.ps1`. Adicionado `/pgdata` ao `.gitignore`.

---

### 1.8 InstalaÃ§Ã£o do PostgreSQL via winget

- **Contexto:** UsuÃ¡rio pediu para instalar o necessÃ¡rio para rodar PostgreSQL local.
- **AÃ§Ã£o:** Executado `winget install PostgreSQL.PostgreSQL.16 --accept-package-agreements --accept-source-agreements --silent`. O download (346 MB) e o inÃ­cio da instalaÃ§Ã£o foram concluÃ­dos; o instalador do EDB pode abrir um assistente para definir a senha do usuÃ¡rio `postgres` e a porta.
- **PÃ³s-instalaÃ§Ã£o:** Ã‰ preciso (1) concluir o assistente (senha do `postgres`; usar `postgres` para bater com o `.env` ou ajustar o `.env`), (2) iniciar o serviÃ§o PostgreSQL em `services.msc` (ou `Start-Service postgresql-x64-16`), (3) rodar `npm run db:create`, `db:migrate`, `db:seed`. Guia em [docs/POSTGRESQL_WINDOWS.md](../POSTGRESQL_WINDOWS.md).

---

### 1.7 PostgreSQL nÃ£o estÃ¡ rodando (ECONNREFUSED :5432)

- **Contexto:** Rodar `scripts/create-db.ts` ou `npm run db:migrate` apÃ³s criar o `.env` com `DATABASE_URL=postgresql://postgres:postgres@localhost:5432/vysen`.
- **Erro:** `connect ECONNREFUSED 127.0.0.1:5432` (e `::1:5432`).
- **Causa:** O serviÃ§o PostgreSQL nÃ£o estÃ¡ instalado ou nÃ£o estÃ¡ em execuÃ§Ã£o no Windows.
- **SoluÃ§Ã£o:** Instalar o PostgreSQL (ex.: [postgresql.org/download/windows](https://www.postgresql.org/download/windows)) ou subir um container Docker (`docker run -d -p 5432:5432 -e POSTGRES_PASSWORD=postgres postgres`). Depois iniciar o serviÃ§o (Services â†’ postgresql-x64) ou garantir que o container estÃ¡ rodando. Em seguida rodar `npx tsx scripts/create-db.ts` e `npm run db:migrate` e `npm run db:seed`.

---

### 1.13 Porta diferente a cada vez que sobe o dev

- **Contexto:** Ao rodar `npm run dev`, a aplicaÃ§Ã£o Ã s vezes abria em 3001, 3002, 3003, etc.
- **Causa:** O Next.js, quando a porta padrÃ£o **3000** jÃ¡ estÃ¡ em uso (por exemplo um `npm run dev` anterior ainda rodando em outro terminal), escolhe automaticamente a prÃ³xima porta livre e sÃ³ avisa no terminal.
- **SoluÃ§Ã£o:** O script `dev` foi alterado para **fixar a porta 3000**: `next dev -p 3000`. Assim a app sempre sobe em **http://localhost:3000**. Se a 3000 estiver ocupada, o comando vai **falhar** (erro â€œport already in useâ€) em vez de mudar de porta â€” aÃ­ Ã© sÃ³ encerrar o processo que estÃ¡ usando a 3000 (ou fechar o outro terminal onde o dev estava rodando) e rodar `npm run dev` de novo.

---

### 1.14 404 "This page could not be found" na raiz (/)

- **Contexto:** Ao acessar a aplicaÃ§Ã£o (ex.: http://localhost:3000), a pÃ¡gina exibia 404 mesmo com `app/page.tsx` e `app/login/page.tsx` existindo.
- **Causa:** Conflito de rotas: no App Router, o grupo `(dashboard)` **nÃ£o** altera a URL. Assim, `app/(dashboard)/page.tsx` tambÃ©m mapeava para **`/`**, gerando duas pÃ¡ginas para a mesma rota e comportamento indefinido (404).
- **SoluÃ§Ã£o:** Toda a Ã¡rea do dashboard foi movida para dentro do segmento `dashboard`: de `app/(dashboard)/page.tsx` e `app/(dashboard)/home`, `context`, etc. para `app/(dashboard)/dashboard/page.tsx` e `app/(dashboard)/dashboard/home`, `context`, etc. Com isso, a rota `/` fica apenas com `app/page.tsx` (landing) e `/dashboard`, `/dashboard/home`, etc. passam a funcionar. TambÃ©m foi incluÃ­do `"/"` explicitamente no `matcher` do middleware e removido o layout vazio do grupo `(auth)`. Limpar `.next` e reiniciar o dev apÃ³s a alteraÃ§Ã£o.

---

### 1.12 404 ao acessar a aplicaÃ§Ã£o (login)

- **Contexto:** ApÃ³s corrigir o ENOENT (limpar .next), ao acessar a URL da app no navegador retornava 404.
- **Causa provÃ¡vel:** No Windows, o Next.js pode falhar ao resolver rotas em pastas com parÃªnteses no nome (route groups como `(auth)`), gerando arquivos em `.next\server\app\(auth)\...` que nÃ£o sÃ£o encontrados corretamente.
- **SoluÃ§Ã£o:** A pÃ¡gina de login foi movida do grupo `(auth)` para a rota direta: de `app/(auth)/login/page.tsx` para `app/login/page.tsx`. A URL continua sendo `/login`. O grupo `(auth)` pode permanecer vazio ou ser removido; nÃ£o afeta a rota `/login`.

---

### 1.11 ENOENT no navegador: .next/server/app/(auth)/login/page.js

- **Contexto:** Ao acessar a aplicaÃ§Ã£o no navegador (ex.: pÃ¡gina de login), erro: `ENOENT: no such file or directory, open '...\.next\server\app\(auth)\login\page.js'`.
- **Causa:** Cache de build do Next.js (pasta `.next`) desatualizado ou corrompido; o arquivo compilado esperado nÃ£o existe.
- **SoluÃ§Ã£o:** Apagar a pasta `.next` e reiniciar o servidor para forÃ§ar recompilaÃ§Ã£o: `Remove-Item -Recurse -Force .next` (ou `rm -rf .next`), depois `npm run dev`. Na primeira requisiÃ§Ã£o Ã  rota, o Next gera os arquivos em `.next` de novo.

---

### 1.10 NOTICE de truncamento de identificador nas migrations

- **Contexto:** Ao rodar `npm run db:migrate`, o PostgreSQL emite mensagens do tipo: `o identificador "evolution_webhook_events_evolution_instance_id_evolution_instances_id_fk" serÃ¡ truncado para "evolution_webhook_events_evolution_instance_id_evolution_instan"`.
- **Causa:** O PostgreSQL limita identificadores (nomes de constraints, tabelas, etc.) a **63 caracteres**. O Drizzle gera nomes longos para FKs (tabela_coluna_tabela_ref_id_fk), e alguns passam de 63 caracteres; o Postgres trunca e avisa (NOTICE).
- **Ã‰ erro?** NÃ£o. As migrations foram aplicadas com sucesso; a constraint existe com o nome truncado e funciona normalmente.
- **Quer evitar em novos schemas:** Use `foreignKey()` no terceiro argumento do `pgTable` com `name: "nome_curto_fk"` (mÃ¡x. 63 caracteres) em vez de `.references()` na coluna, para tabelas novas. Para o schema jÃ¡ migrado, nÃ£o Ã© obrigatÃ³rio alterar.

---

## Como adicionar novas entradas

1. Abra [REGISTRO.md](./REGISTRO.md).
2. Insira uma nova seÃ§Ã£o **acima** da mais recente (nÃºmero seguinte ao atual).
3. Use o formato: **Contexto** â†’ **Erro** â†’ **Causa** â†’ **SoluÃ§Ã£o**.
4. Se houver relaÃ§Ã£o com outra entrada, referencie (ex.: â€œVer tambÃ©m 1.3â€).


# Revisão de coerência — projeto e documentação

Data: 2026-04-26  
Escopo: pasta do repositório (`src/`, `docs/`, CI, scripts) vs documentação normativa e operacional.

## 1) Resumo executivo

O projeto tem **base técnica madura** (Next 15, Drizzle, RLS em rollout, worker com filas nomeadas, webhooks com HMAC/replay, CI com smokes reais). A documentação é **extensa (~90 arquivos em `docs/`)**, mas a **autoridade documental está fragmentada**: vários docs normativos descrevem rotas/áreas que já migraram para `/superadmin`, migrations listadas em onboarding estão incompletas, e há **dois padrões de resposta JSON** convivendo na API.

**Veredito:** coerência **média** — código à frente da doc em vários pontos; doc histórica ainda útil, mas não deve ser lida como verdade atual sem cruzar com `src/`.

---

## 2) Mapa de autoridade (o que consultar primeiro)

| Classe | Canonico declarado | Estado real (2026-04-26) |
|--------|-------------------|---------------------------|
| Foundation | `docs/RESUMO_PROJETO.md` | Parcialmente desatualizado (rotas admin, canais Chatwoot/WA Cloud) |
| Constitution | `docs/PADRAO_DESENVOLVIMENTO.md` | **Desatualizado** em rotas (`(admin)` vs `(superadmin)`) |
| Operations | `GETTING_STARTED`, `SECURITY_*`, `DEPLOY_*` | Boa base; migrations incompletas no GETTING_STARTED |
| Adoção arquitetural | *(novo, fora da matriz)* | `docs/ADOCAO_CHATWOOT_*`, `SECURITY_BASELINE_PRODUCAO`, `FILAS_*`, `CONTRATO_*` — **não indexados** em `MATRIZ_AUTORIDADE_DOCUMENTAL.md` |
| History | `CHANGELOG`, `docs/log/REGISTRO.md` | CHANGELOG ainda cita BullMQ; REGISTRO é a fonte mais fiel de evolução recente |

**Recomendação:** atualizar `docs/MATRIZ_AUTORIDADE_DOCUMENTAL.md` com classe **Architecture** apontando para os novos docs de adoção Chatwoot.

---

## 3) Coerência código ↔ documentação por camada

### 3.1 Rotas e superfícies (crítico)

**Código atual (`src/app/`):**

| Superfície | Grupo App Router | URL | Observação |
|------------|------------------|-----|------------|
| Dashboard tenant | `(dashboard)/dashboard/*` | `/dashboard/*` | Alinhado à doc |
| Superadmin (oficial) | `(superadmin)/superadmin/*` | `/superadmin/*` | **Canônico** para tenants, users, integrations, observability |
| Admin legado | `(admin)/admin/*` | `/admin/*` | Muitas rotas ainda existem; parte redireciona ou duplica superadmin |
| Company admin | `(company-admin)/admin/*` | `/admin/*` | **Não documentado** em PADRAO_DESENVOLVIMENTO |
| APIs | `src/app/api/*` | `/api/dashboard`, `/api/admin`, `/api/webhooks`, … | Coerente |

**Doc desatualizada:**

- `docs/PADRAO_DESENVOLVIMENTO.md` §2–3: só `(admin)/admin/*`; não menciona `(superadmin)` nem `(company-admin)`.
- `.cursor/rules/padrao-desenvolvimento.mdc`: idem.
- `docs/RESUMO_PROJETO.md` §2: lista `(admin)` como área principal.
- `docs/MATRIZ_AUTORIDADE_DOCUMENTAL.md` pendência sobre link Admin no dashboard — ainda válida; falta pendência sobre **duplicidade `/admin` legado vs `/superadmin`**.

**Middleware (`src/middleware.ts`):** protege `/dashboard`, `/admin` e `/superadmin` — **mais amplo** que PADRAO (que só cita `/admin`).

### 3.2 Banco e migrations (alto)

- **21 arquivos SQL** em `src/db/migrations/` (0000–0019, com duplicata numérica `0004_*`).
- `docs/GETTING_STARTED.md` lista apenas até `0003_hardening_integrations.sql` — **gravemente incompleto** para quem sobe ambiente novo.
- `docs/db/MIGRATION_ORDER.md` descreve abordagem teórica (0001–0007 por domínio), não o histórico real 0000–0019.
- RLS: `0016` + `0017` referenciados corretamente em `SECURITY_ACCEPTANCE_CHECKLIST.md`.
- Novo baseline: `docs/SECURITY_BASELINE_PRODUCAO.md` — **coerente** com `startup-guards.ts` + `instrumentation.ts`.

### 3.3 Filas e worker (bom)

- Código: fila Redis manual (`src/workers/queue/client.ts`), política P0/P1/P2 em `policy.ts`, DLQ por domínio — **coerente** com `docs/FILAS_SLO_RETRY_DLQ.md`.
- `README.md`: descreve implementação interna — **correto**.
- `CHANGELOG.md` / `package.json`: ainda mencionam **BullMQ** sem uso no código — **incoerente**.
- `docs/plano_f1_f5_governanca_vysen*.md`: já alertam sobre BullMQ — alinhado à realidade, não ao CHANGELOG.

### 3.4 APIs e contratos (médio — migração parcial)

**Padrão novo** (`src/server/http/api-contract.ts`):

```json
{ "ok": true, "data": { ... } }
{ "ok": false, "error": { "code", "message" } }
```

**Rotas já no envelope:** webhooks (5), `dashboard/vysen/chat`, `dashboard/notifications`, erros de auth dashboard.

**Rotas ainda no formato legado** (amostra): `context/tenant`, `onboarding/status`, `complaints`, `support`, `funnels/*`, `leads/[id]`, etc. — dezenas de endpoints com `{ ok: true }` flat ou `{ error: string }`.

**Frontend:**

- Vysen: usa `dashboard-api-client` — **coerente**.
- Notificações: API migrada; consumidores foram ajustados para ler `data.data.notifications` — **corrigido nesta revisão**.

**Doc:** `docs/CONTRATO_API_WEBHOOKS.md` declara migração parcial — **honesta**; falta lista de rotas pendentes ou ADR de transição.

### 3.5 Segurança (bom, com drift de flags)

| Item | Doc | Código |
|------|-----|--------|
| RLS rollout | SECURITY_ACCEPTANCE_CHECKLIST | `0016`, `access-context`, flags |
| CSRF | checklist + .env.example | `csrf.ts`, bootstrap |
| Baseline prod obrigatório | SECURITY_BASELINE_PRODUCAO | `assertProductionSecurityBaseline` |
| Webhooks HMAC/replay | SECURITY_ENDPOINTS_MAP, BASE2 | implementado |
| Worker META_APP_SECRET | .env.example | `startup-guards` |

**Risco:** flags opcionais em dev podem ser copiadas para prod se checklist não for seguido — doc mitiga, processo depende de operação.

### 3.6 Frontend e design system (bom)

- `docs/design-system/code-and-implementation.md` ↔ componentes em `src/components/ui` e `layout/` — **alinhado**.
- `PADRAO_DESENVOLVIMENTO` Aura/zinc vs paleta CL em tailwind — **coexistência documentada** em design-system; não é bug, mas exige disciplina (evitar estilos fora do token).
- `docs/FRONTEND_DATA_LAYER_INCREMENTAL.md` — descreve só migração Vysen; **correto e limitado**.

### 3.7 Governança CI/CD (bom)

- `ci:verify` = lint + typecheck + **test** + build + smokes — alinhado a `package.json`.
- Workflow Docker: removido push automático de `:latest` — **melhora coerência operacional** (verificar se `DEPLOY_VPS.md` ainda recomenda `latest`).
- Plano F2 cita Playwright; runtime usa scripts TS — **doc de governança diverge do CI** (já notado em plano_f1_f5).

---

## 4) Inventário dos novos docs (adoção Chatwoot) vs matriz

Arquivos criados na adoção arquitetural **não constam** em `MATRIZ_AUTORIDADE_DOCUMENTAL.md`:

| Arquivo | Função |
|---------|--------|
| `ADOCAO_CHATWOOT_BASELINE_GAPS.md` | Diagnóstico + gaps |
| `SECURITY_BASELINE_PRODUCAO.md` | Guardrails prod |
| `FILAS_SLO_RETRY_DLQ.md` | Política de filas |
| `CONTRATO_API_WEBHOOKS.md` | Contrato API/webhook |
| `FRONTEND_DATA_LAYER_INCREMENTAL.md` | Cliente API front |
| `EVENTOS_OBSERVABILIDADE_MINIMA.md` | Eventos estruturados |
| `AI_BUSCA_HIPOTESES_METRICAS.md` | Gate IA/busca |
| `chatwoot_analise_estrutural_saas.md` | Referência externa (análise) |

**Coerência interna entre eles:** alta. **Coerência com matriz canônica:** baixa (ausência de indexação).

---

## 5) Achados priorizados

### P0 — corrigir ou decidir já

1. **PADRAO_DESENVOLVIMENTO + regra Cursor** desatualizados sobre rotas admin/superadmin/company-admin.
2. **GETTING_STARTED** com lista de migrations truncada (risco de ambiente quebrado).
3. **Contrato API híbrido** sem política de transição explícita para todas as rotas dashboard (regressões como notificações).
4. **`bullmq` em `package.json`** sem uso — documentação mista (README ok, CHANGELOG errado).

### P1 — próximas 2–4 semanas

5. Consolidar `/admin` legado → redirect total para `/superadmin` ou documentar matriz de URLs oficial.
6. Documentar `(company-admin)` ou remover se experimental.
7. Atualizar `RESUMO_PROJETO.md` (Chatwoot, WhatsApp Cloud, Meta, Clarity, Vysen, RLS).
8. Indexar docs de adoção na `MATRIZ_AUTORIDADE_DOCUMENTAL.md`.
9. Revisar `DEPLOY_VPS` / Portainer quanto ao uso de tag `latest`.

### P2 — dívida histórica aceitável

10. Docs `BASE2_*`, revisões de março/2026-03 — contexto histórico; manter com banner "histórico".
11. `docs/db/MIGRATION_ORDER.md` — guia conceitual, não inventário real.
12. Duplicata de migration `0004_*` — operacional, documentar ordem real em `db/MIGRATION_ORDER` ou README migrate.

---

## 6) O que está coerente (manter)

- Separação app/worker/postgres/redis.
- Tenant via sessão + RLS em rollout.
- Webhooks com validação central (`webhook-request.ts`) e replay.
- Design system mapeado em `code-and-implementation.md`.
- Smoke tests no CI refletindo integrações críticas.
- Documentação de segurança operacional (checklist + endpoints map) alinhada ao código.
- Novos docs de adoção Chatwoot coerentes entre si e com implementação recente.

---

## 7) Plano de saneamento documental (incremental)

| Etapa | Ação | Esforço |
|-------|------|---------|
| 1 | Atualizar `PADRAO_DESENVOLVIMENTO.md` + `.cursor/rules` com `(superadmin)`, `(company-admin)`, middleware | Pequeno |
| 2 | Substituir lista de migrations em `GETTING_STARTED` por referência a `src/db/migrations/` + `0013–0019` | Pequeno |
| 3 | Estender `MATRIZ_AUTORIDADE_DOCUMENTAL.md` (classe Architecture + links adoção) | Pequeno |
| 4 | Remover `bullmq` do `package.json` ou documentar ADR de remoção; corrigir CHANGELOG | Pequeno |
| 5 | ADR de transição API envelope + checklist de rotas migradas em `CONTRATO_API_WEBHOOKS.md` | Médio |
| 6 | Atualizar `RESUMO_PROJETO.md` escopo e tabela funcionalidades | Médio |

---

## 8) Correção aplicada nesta revisão

- **Notificações:** `dashboard-notification-bell.tsx` e `dashboard/notifications/page.tsx` passam a interpretar resposta envelope `{ ok, data: { notifications } }` com fallback ao formato legado.

---

**Conclusão:** o código evoluiu mais rápido que a camada **Constitution/Operations** da documentação. Priorizar sincronização de rotas, migrations e contrato API evita regressões e onboarding quebrado, sem reescrita do repositório.

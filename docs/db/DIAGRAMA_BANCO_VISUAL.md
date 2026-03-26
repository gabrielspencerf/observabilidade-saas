# Diagrama do banco — visual para print

**Versão HTML (navegador):** abra [`estrutura-banco.html`](estrutura-banco.html) no Chrome/Edge — mapa + lista completa em uma página.

Abra este arquivo em **preview Markdown** (Cursor/VS Code ou GitHub) em **tela cheia** (`Ctrl+K` `V` ou preview ao lado). Cada seção abaixo cabe bem em **um print** (zoom 100–125% se precisar).

---

## 1. Visão geral — um print só (domínios)

```mermaid
%%{init: {'theme': 'neutral', 'flowchart': {'nodeSpacing': 28, 'rankSpacing': 40, 'padding': 12}, 'themeVariables': {'fontSize': '15px', 'fontFamily': 'system-ui, Segoe UI, sans-serif'}}}%%
flowchart TB
  TENANT[["🏢 TENANTS<br/>(organização — raiz multi-tenant)"]]

  AUTH["🔐 AUTH GLOBAL<br/>─────────────<br/>users · sessions · user_profiles<br/>password_reset_tokens<br/>roles · permissions · role_permissions<br/>memberships → user + tenant + role"]
  INT["🔌 INTEGRAÇÕES<br/>─────────────<br/>integrations *<br/>evolution_instances · uazapi_instances<br/>typebot_bots · google_ads_accounts<br/>meta_ads_accounts · clarity_connections"]
  RAW["📥 RAW / SYNC LOGS<br/>─────────────<br/>evolution_webhook_events<br/>uazapi_webhook_events<br/>typebot_webhook_events<br/>google_ads_sync_logs · meta_ads_sync_logs"]
  FUN["🎯 FUNIL & LEADS<br/>─────────────<br/>funnels · funnel_steps<br/>leads · lead_events · lead_sources<br/>utm_attributions · followup_tasks"]
  CRM["👤 CRM<br/>─────────────<br/>contacts · opportunities · products"]
  MSG["💬 CONVERSAS<br/>─────────────<br/>conversations<br/>conversation_messages"]
  SNAP["📊 SNAPSHOTS<br/>─────────────<br/>campaign_snapshots<br/>bot_metrics_snapshots<br/>funnel_step_metrics_snapshot<br/>instance_status_logs<br/>meta_ads_insight_snapshots<br/>clarity_insight_snapshots"]
  AI["🤖 IA & ALERTAS<br/>─────────────<br/>ai_classifications<br/>alerts · audit_logs<br/>kpi_rules · processing_failures"]
  APP["⚙️ APP / TENANT<br/>─────────────<br/>internal_notifications<br/>tenant_assets · complaints<br/>pagespeed_results<br/>onboarding_steps<br/>tenant_onboarding_progress<br/>app_global_config"]
  VYS["🧠 VYSEN (migrations)<br/>─────────────<br/>knowledge_documents<br/>knowledge_chunks<br/>knowledge_embeddings<br/>vysen_usage_events"]

  TENANT --> AUTH
  TENANT --> INT
  TENANT --> RAW
  TENANT --> FUN
  TENANT --> CRM
  TENANT --> MSG
  TENANT --> SNAP
  TENANT --> AI
  TENANT --> APP
  TENANT --> VYS

  INT -.-> RAW
  FUN -.-> CRM
  CRM -.-> MSG
  INT -.-> MSG
```

**Integrations:** `provider_resource_id` aponta para a linha do provedor (sem FK polimórfica no Postgres).

**Vysen:** tabelas nas migrations `0014`–`0015` (pgvector em `knowledge_embeddings`).

---

## 2. Auth e acesso (print separado)

```mermaid
%%{init: {'theme': 'neutral', 'themeVariables': {'fontSize': '16px'}}}%%
flowchart LR
  subgraph G["Globais — sem tenant_id"]
    U[(users)]
    R[(roles)]
    P[(permissions)]
    RP[(role_permissions)]
    R --- RP
    P --- RP
  end

  T[(tenants)]
  M[(memberships)]

  U --> M
  T --> M
  R --> M

  S[(sessions)]
  U --> S
  T -. current_tenant .- S

  UP[(user_profiles)]
  U --> UP

  PR[(password_reset_tokens)]
  U --> PR
```

---

## 3. Integrações → eventos brutos (print separado)

```mermaid
%%{init: {'theme': 'neutral', 'themeVariables': {'fontSize': '16px'}}}%%
flowchart TB
  T[(tenants)]

  I[(integrations)]
  E[(evolution_instances)]
  U[(uazapi_instances)]
  TB[(typebot_bots)]
  GA[(google_ads_accounts)]
  MA[(meta_ads_accounts)]
  CC[(clarity_connections)]

  T --> I
  T --> E
  T --> U
  T --> TB
  T --> GA
  T --> MA
  T --> CC

  EW[(evolution_webhook_events)]
  UW[(uazapi_webhook_events)]
  TW[(typebot_webhook_events)]
  GL[(google_ads_sync_logs)]
  ML[(meta_ads_sync_logs)]

  T --> EW
  E --> EW
  T --> UW
  U --> UW
  T --> TW
  T --> GL
  GA --> GL
  T --> ML
  MA --> ML

  I -. "provider_resource_id" .- E
  I -. "idem" .- U
  I -. "idem" .- TB
  I -. "idem" .- GA
```

---

## 4. Funil, leads e tarefas (print separado)

```mermaid
%%{init: {'theme': 'neutral', 'themeVariables': {'fontSize': '16px'}}}%%
flowchart TB
  T[(tenants)]

  F[(funnels)]
  FS[(funnel_steps)]
  L[(leads)]
  LE[(lead_events)]
  LS[(lead_sources)]
  UTM[(utm_attributions)]
  FU[(followup_tasks)]
  INT[(integrations)]

  T --> F
  T --> FS
  F --> FS

  T --> L
  F -. funnel_id .- L
  FS -. current_step .- L
  INT -. source .- L

  T --> LE
  L --> LE
  FS -. opcional .- LE
  INT -. opcional .- LE

  T --> LS
  T --> UTM
  L --> UTM

  T --> FU
  L --> FU
  F -. opcional .- FU
```

---

## 5. Contatos, conversas e oportunidades (print separado)

```mermaid
%%{init: {'theme': 'neutral', 'themeVariables': {'fontSize': '16px'}}}%%
flowchart TB
  T[(tenants)]

  C[(contacts)]
  CV[(conversations)]
  CM[(conversation_messages)]
  O[(opportunities)]
  PR[(products)]

  E[(evolution_instances)]
  U[(uazapi_instances)]
  L[(leads)]

  T --> C
  T --> CV
  L -. opcional .- CV
  C -. opcional .- CV
  E --> CV
  U --> CV

  T --> CM
  CV --> CM

  T --> O
  L -. opcional .- O
  C -. opcional .- O
  CV -. opcional .- O

  T --> PR
```

---

## 6. Snapshots e métricas (print separado)

```mermaid
%%{init: {'theme': 'neutral', 'themeVariables': {'fontSize': '16px'}}}%%
flowchart TB
  T[(tenants)]

  GA[(google_ads_accounts)]
  MA[(meta_ads_accounts)]
  CL[(clarity_connections)]

  CS[(campaign_snapshots)]
  BM[(bot_metrics_snapshots)]
  FM[(funnel_step_metrics_snapshot)]
  ISL[(instance_status_logs)]
  MIS[(meta_ads_insight_snapshots)]
  CIS[(clarity_insight_snapshots)]

  T --> CS
  GA --> CS

  T --> BM
  T --> FM
  T --> ISL

  T --> MIS
  MA --> MIS

  T --> CIS
  CL --> CIS
```

---

## 7. IA, alertas e Vysen (print separado)

```mermaid
%%{init: {'theme': 'neutral', 'themeVariables': {'fontSize': '16px'}}}%%
flowchart TB
  T[(tenants)]
  U[(users)]
  CV[(conversations)]
  L[(leads)]

  AC[(ai_classifications)]
  AL[(alerts)]
  AU[(audit_logs)]
  KPI[(kpi_rules)]
  PF[(processing_failures)]

  T --> AC
  CV --> AC
  L -. opcional .- AC

  T --> AL
  T --> AU
  T --> KPI
  T --> PF

  KD[(knowledge_documents)]
  KC[(knowledge_chunks)]
  KE[(knowledge_embeddings)]
  VU[(vysen_usage_events)]

  T --> KD
  KD --> KC
  KC --> KE
  T --> KC
  T --> KE

  T --> VU
  U -. opcional .- VU
```

---

## Dica de print

1. Preview Markdown **sem sidebar** (janela maximizada).
2. **Um diagrama por captura** — evita letra minúscula no papel.
3. No navegador (GitHub): zoom **110%** se o renderizador Mermaid comprimir.

Fonte dos nomes: `src/db/schema/` + migrations `0014`, `0015`, `0016`, `0018`.

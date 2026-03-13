# Organização do schema Drizzle e convenções

## 1. Proposta de organização dos arquivos de schema

```
src/db/
├── schema/
│   ├── index.ts                    # Re-exporta todos os schemas (entrada para Drizzle)
│   ├── auth/
│   │   ├── index.ts
│   │   ├── tenants.ts
│   │   ├── users.ts
│   │   ├── roles.ts
│   │   ├── permissions.ts
│   │   ├── role-permissions.ts
│   │   ├── memberships.ts
│   │   └── sessions.ts
│   ├── integrations/
│   │   ├── index.ts
│   │   ├── integrations.ts
│   │   ├── google-ads-accounts.ts
│   │   ├── typebot-bots.ts
│   │   └── evolution-instances.ts
│   ├── raw-events/
│   │   ├── index.ts
│   │   ├── typebot-webhook-events.ts
│   │   ├── evolution-webhook-events.ts
│   │   └── google-ads-sync-logs.ts
│   ├── funnels-leads/
│   │   ├── index.ts
│   │   ├── funnels.ts
│   │   ├── funnel-steps.ts
│   │   ├── lead-sources.ts
│   │   ├── utm-attributions.ts
│   │   ├── leads.ts
│   │   └── lead-events.ts
│   ├── conversations/
│   │   ├── index.ts
│   │   ├── conversations.ts
│   │   └── conversation-messages.ts
│   ├── snapshots/
│   │   ├── index.ts
│   │   ├── campaign-snapshots.ts
│   │   ├── bot-metrics-snapshots.ts
│   │   ├── instance-status-logs.ts
│   │   └── funnel-step-metrics-snapshot.ts
│   └── ai-alerts-audit/
│       ├── index.ts
│       ├── ai-classifications.ts
│       ├── kpi-rules.ts
│       ├── alerts.ts
│       ├── audit-logs.ts
│       └── processing-failures.ts
├── enums.ts                       # Enums de banco (pgEnum) compartilhados
└── drizzle.config.ts              # Configuração do drizzle-kit (na raiz ou em /db)
```

Cada domínio tem sua pasta com um `index.ts` que re-exporta as tabelas do domínio. O `schema/index.ts` importa todos os domínios e exporta para o `drizzle.config.ts` e para o cliente Drizzle.

---

## 2. Convenções adotadas no Drizzle

| Convenção | Adoção |
|-----------|--------|
| **PK** | Sempre `id uuid PRIMARY KEY DEFAULT gen_random_uuid()` — uso de `uuid('id').primaryKey().defaultRandom()`. |
| **Timestamps** | `timestamp({ withTimezone: true, precision: 6 })` para todas as colunas de data/hora (equivalente a `timestamptz`). |
| **Datas sem hora** | `date()` para `period_start` / `period_end` em snapshots. |
| **Nomes de tabelas** | snake_case no banco; nomes em inglês, plural para coleções (tenants, users, leads). |
| **Nomes de colunas** | snake_case; mesmos nomes no TypeScript (sem alias) para simplicidade. |
| **FKs** | Sempre `uuid`; nome da coluna `{tabela_singular}_id` (ex.: `tenant_id`, `user_id`). |
| **Enums de banco** | Apenas onde há valor claro de consistência e consultas por tipo; demais casos `varchar` com validação na aplicação. |
| **Default de id** | `.defaultRandom()` para UUID (gera `gen_random_uuid()` no SQL). |
| **created_at** | `timestamp({ withTimezone: true }).defaultNow().notNull()` onde aplicável. |
| **updated_at** | `timestamp({ withTimezone: true }).defaultNow().$onUpdate(() => new Date())` onde aplicável. |
| **Export** | Tabelas exportadas como `export const tableName = pgTable(...)`; relações definidas em um único lugar (ex.: `schema/index.ts` ou arquivo `relations.ts`) para evitar dependências circulares. |

---

## 3. Observações de compatibilidade Drizzle + PostgreSQL

### 3.1 UUID e default
- **Uso:** `uuid('id').primaryKey().defaultRandom()`.
- **Cuidado:** Em versões antigas do drizzle-kit (antes de 0.19.1) houve bug com `.defaultRandom()` gerando SQL inválido; usar Drizzle/drizzle-kit recentes (ex.: 0.31+ e kit 0.22+).
- **Alternativa:** `default(sql\`gen_random_uuid()\`)` se necessário.

### 3.2 Timestamps com timezone
- **Uso:** `timestamp({ withTimezone: true, precision: 6 })` — gera `timestamp(6) with time zone` (timestamptz).
- **Modo:** Usar `mode: 'date'` para inferir tipo TypeScript `Date`; omitir para string ISO.

### 3.3 Índices únicos parciais (WHERE)
- **Suporte:** A partir de drizzle-kit 0.22.0 / drizzle-orm 0.31.0, `.where(sql\`...\`)` em `uniqueIndex()` gera corretamente o `WHERE` no PostgreSQL.
- **Sintaxe:** `uniqueIndex('nome').on(table.col1, table.col2).where(sql\`${table.col2} IS NOT NULL\`)`.
- **Cuidado:** O `.where()` deve usar expressão SQL que referencia colunas da própria tabela; validar o SQL gerado na primeira migration.
- **Fallback:** Se a migration gerada não incluir o WHERE, adicionar manualmente em um arquivo SQL de migration (ex.: `ALTER` ou migration customizada).

### 3.4 Enums (pgEnum)
- **Uso:** `pgEnum('nome_enum', ['valor1', 'valor2'])` — cria tipo ENUM no PostgreSQL.
- **Cuidado:** Alterar enum (adicionar/remover valor) exige migration específica (ALTER TYPE); adicionar valor no final é mais seguro.
- **Onde usar:** provider_enum, lead_status_enum, conversation_status_enum, classification_type_enum, alert_severity_enum, alert_status_enum, kpi_rule_type_enum, audit_action_enum (opcional). **roles.slug** permanece varchar, sem enum no banco.

### 3.5 JSONB
- **Uso:** `jsonb('coluna')`; opcional `.$type<MyType>()` para inferência TypeScript.
- **Default:** `jsonb().default({})` ou `default(sql\`'{}'::jsonb\`)` para objeto vazio.
- **Cuidado:** Drizzle não valida estrutura em runtime; tipos são apenas para TypeScript.

### 3.6 Relações (relations) e ordem de import
- Para evitar dependências circulares, as tabelas são definidas sem `relations()` nos arquivos de tabela. As relações podem ser declaradas em um arquivo separado (ex.: `schema/relations.ts`) que importa todas as tabelas, ou em cada domínio. Para o schema inicial, focamos em tabelas + FKs; relações Drizzle são opcionais para queries.

---

## 4. Constraints que podem exigir SQL complementar

| Constraint | Onde | Observação |
|------------|------|------------|
| **Unique parcial em leads** | (tenant_id, normalized_email) WHERE normalized_email IS NOT NULL | Verificar se drizzle-kit gera o WHERE; se não, adicionar em migration manual. |
| **Unique parcial em leads** | (tenant_id, normalized_phone) WHERE normalized_phone IS NOT NULL | Idem. |
| **Unique parcial em leads** | (tenant_id, source_provider, source_external_id) WHERE source_external_id IS NOT NULL | Idem. |
| **Unique parcial em ai_classifications** | (conversation_id) WHERE is_current = true | Garante no máximo uma classificação vigente por conversa; validar SQL gerado. |

Nenhuma outra constraint da modelagem aprovada exige SQL fora do que o Drizzle declara; as listadas acima devem ser conferidas na primeira geração de migrations.

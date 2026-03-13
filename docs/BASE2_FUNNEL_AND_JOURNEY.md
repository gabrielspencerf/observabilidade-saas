# Funil e jornada do lead (visão operacional)

Documentação da primeira versão da visão de funil e da jornada do lead no dashboard por tenant.

## Proposta de modelagem / uso dos dados existentes

- **Volume por etapa:** Para cada funil do tenant, usam-se as tabelas `funnels`, `funnel_steps` e `leads`. Cada lead com `funnel_id` preenchido é contado em exatamente um “bucket”: `current_funnel_step_id = <step_id>` para cada etapa do funil, ou `current_funnel_step_id IS NULL` (contagem “sem etapa”). Assim obtém-se o volume por etapa e o volume de leads no funil ainda sem etapa atribuída.
- **Progressão e gargalos:** A UI exibe as etapas em ordem (`funnel_steps.sort_order`) com as contagens. A sequência de volumes e a variação percentual entre etapas consecutivas indicam onde estão os gargalos, sem necessidade de gráficos complexos.
- **Jornada do lead:** No detalhe do lead usam-se `leads.funnel_id`, `leads.current_funnel_step_id` e `lead_events` com `funnel_step_id` quando existir. O detalhe mostra o funil e a etapa atual do lead (joins em `funnels` e `funnel_steps`). Os eventos são listados por `occurred_at` e, quando o evento tem `funnel_step_id`, é exibido o nome da etapa (join em `funnel_steps`), permitindo ler a passagem do lead pelas etapas ao longo do tempo.

## Arquivos criados

| Arquivo | Descrição |
|--------|-----------|
| `src/server/dashboard/funnel.ts` | `getFunnelOverviewForTenant(tenantId)`: lista funis do tenant, etapas ordenadas e contagem de leads por etapa e “sem etapa”. |
| `src/app/(dashboard)/funnel/layout.tsx` | Layout da área Funil (tenant context + `DashboardShell`). |
| `src/app/(dashboard)/funnel/page.tsx` | Página de visão de funil: por funil, etapas com volume e % de queda, e bloco “Sem etapa” quando houver. |
| `docs/BASE2_FUNNEL_AND_JOURNEY.md` | Este documento. |

## Arquivos alterados

| Arquivo | Alteração |
|--------|------------|
| `src/server/dashboard/index.ts` | Export de `getFunnelOverviewForTenant` e tipos `FunnelOverviewRow`, `FunnelStepVolume`. |
| `src/server/dashboard/lead-detail.ts` | Lead: inclusão de `funnelId`, `currentFunnelStepId`, `funnelName`, `currentStepName` (joins em `funnels` e `funnel_steps`). Eventos: inclusão de `stepName` (left join em `funnel_steps` por `lead_events.funnel_step_id`). |
| `src/app/(dashboard)/leads/[id]/page.tsx` | Exibição de “Funil” e “Etapa atual” nos dados principais; na jornada (eventos), exibição da etapa associada quando existir. |
| `src/components/dashboard-shell.tsx` | Link “Funil” no nav para `/dashboard/funnel`. |

## Queries principais

1. **Visão de funil (volumes por etapa)**  
   - Listar funis do tenant: `SELECT id, name, is_active FROM funnels WHERE tenant_id = $1 ORDER BY name`.  
   - Listar etapas: `SELECT id, funnel_id, name, sort_order FROM funnel_steps WHERE tenant_id = $1 ORDER BY funnel_id, sort_order`.  
   - Contagem por (funnel, step):  
     `SELECT funnel_id, current_funnel_step_id, count(*) FROM leads WHERE tenant_id = $1 AND funnel_id IS NOT NULL GROUP BY funnel_id, current_funnel_step_id`.  
   A aplicação monta, para cada funil, a lista de etapas ordenadas com contagem e o total “sem etapa” (onde `current_funnel_step_id IS NULL`).

2. **Detalhe do lead (funil e etapa atual)**  
   - Lead com funil e etapa:  
     `SELECT l.*, f.name AS funnel_name, fs.name AS current_step_name FROM leads l LEFT JOIN funnels f ON l.funnel_id = f.id LEFT JOIN funnel_steps fs ON l.current_funnel_step_id = fs.id WHERE l.tenant_id = $1 AND l.id = $2`.

3. **Eventos do lead com etapa**  
   - Eventos com nome da etapa:  
     `SELECT e.id, e.event_type, e.occurred_at, e.payload, fs.name AS step_name FROM lead_events e LEFT JOIN funnel_steps fs ON e.funnel_step_id = fs.id WHERE e.lead_id = $1 ORDER BY e.occurred_at`.

## Evolução: métricas, conversão, gargalo e período

### Arquivos alterados nesta evolução

| Arquivo | Alteração |
|--------|------------|
| `src/server/dashboard/funnel.ts` | Opção `periodDays` em `getFunnelOverviewForTenant(tenantId, options)`. Contagem de leads com filtro opcional `first_seen_at` no período. Tipos `FunnelStepVolume` com `conversionFromPrevious` e `percentOfTotal`; `FunnelOverviewRow` com `unassignedPercentOfTotal` e `bottleneckFromStepIndex`. Cálculo de conversão, % do total e índice do gargalo (pior conversão entre etapas consecutivas). |
| `src/server/dashboard/index.ts` | Export de `FunnelOverviewOptions`. |
| `src/app/(dashboard)/funnel/page.tsx` | Filtro por período (Todos, 7, 30, 90 dias) via query `period`. Exibição de conversão da etapa anterior, % do total por etapa e no bloco “Sem etapa”. Destaque visual (borda/anel âmbar) na etapa “possível gargalo”. |
| `docs/BASE2_FUNNEL_AND_JOURNEY.md` | Esta seção. |

### Queries e lógica principais

- **Contagem com período (opcional):**  
  `SELECT funnel_id, current_funnel_step_id, count(*) FROM leads WHERE tenant_id = $1 AND funnel_id IS NOT NULL [AND first_seen_at >= $start AND first_seen_at < $end] GROUP BY funnel_id, current_funnel_step_id`.  
  Quando `periodDays` é informado, `start = current_date - periodDays`, `end = current_date + 1 day`. Assim, o volume e as métricas refletem apenas leads cujo **primeiro contato** (`first_seen_at`) ocorreu no intervalo.

- **Conversão e % do total:** Calculados em memória após agregar contagens. Para cada etapa (e “sem etapa”):  
  - **conversionFromPrevious:** (volume da etapa / volume da etapa anterior) × 100. Nulo na primeira etapa.  
  - **percentOfTotal:** (volume da etapa / totalLeads) × 100, com totalLeads = soma de todas as etapas + sem etapa.

- **Gargalo:** Entre todas as transições etapa i → etapa i+1, identifica a de **menor** taxa de conversão. Retorna `bottleneckFromStepIndex = i` (índice da etapa de origem da pior conversão). Na UI destaca-se a etapa **seguinte** (i+1) como “Possível gargalo”. Exige pelo menos 2 etapas.

### Regras de cálculo

| Métrica | Regra |
|--------|--------|
| Volume por etapa | Contagem de leads com `funnel_id = funil` e `current_funnel_step_id = step_id`. |
| Sem etapa | Contagem com `current_funnel_step_id IS NULL` no mesmo funil. |
| Total do funil | Soma dos volumes de todas as etapas + sem etapa. |
| Conversão da etapa N em relação à anterior | (volume da etapa N / volume da etapa N−1) × 100. Primeira etapa: sem valor. Se etapa anterior = 0, conversão não definida (não exibida). |
| % do total | (volume da etapa ou sem etapa / total do funil) × 100. |
| Gargalo | Transição i → i+1 com menor (volume i+1 / volume i)×100. Destacada na UI a etapa i+1. |

### Período: por que usar first_seen_at

- Com os dados atuais não existe “data de entrada no funil” (não há histórico de quando `funnel_id` ou `current_funnel_step_id` foram setados).  
- Usar **first_seen_at** no período responde: “dos leads que **tiveram primeiro contato** nos últimos N dias, como está a distribuição **atual** por etapa?”. É uma leitura operacional útil (ex.: funil dos leads “novos” do período).  
- Outras leituras (ex.: “leads que **entraram** na etapa X no período”) exigiriam histórico de mudança de etapa ou snapshots, não implementados nesta versão.

### Limitações desta versão (pós-evolução)

- **Período = primeiro contato:** O filtro restringe por `first_seen_at`; não por “quando entrou no funil” ou “quando chegou na etapa”.  
- **Um gargalo por funil:** Só é destacada a transição de pior conversão; não há ranking de todos os gargalos.  
- **Estado atual:** Volumes e conversões refletem o estado atual dos leads (e, com período, o subconjunto por first_seen_at); não há funil “no tempo” (ex.: como estava há 30 dias).  
- **Jornada apenas no detalhe do lead:** Inalterado; não há vista agregada de jornadas.  
- **Sem IA e sem gráficos:** Mantido; foco em leitura operacional com tabela/cards.

---

## Limitações da primeira versão (referência)

- **Jornada apenas no detalhe do lead:** A passagem do lead pelas etapas é visível na lista de eventos do detalhe do lead; não existe vista agregada de “jornadas” (ex.: funil de eventos ao longo do tempo).
- **Eventos com etapa:** A etapa no evento só aparece quando `lead_events.funnel_step_id` está preenchido (ver [BASE2_FUNNEL_DATA_QUALITY.md](./BASE2_FUNNEL_DATA_QUALITY.md)).
- **Sem IA e sem gráficos:** Foco em utilidade operacional com dados atuais.

# Base 2 — Atribuição operacional Google Ads → Leads (primeira camada)

## 1. Objetivo

Criar uma visão inicial e honesta da relação entre aquisição paga (Google Ads) e leads, usando dados já existentes (utm_attributions, leads, google_ads_accounts, campaign_snapshots). Sem atribuição perfeita, sem modelos complexos; foco em consistência e transparência.

---

## 2. Proposta de modelagem e regra

### 2.1 Base de dados utilizada

- **utm_attributions**: por lead, um ou mais toques com utm_source, utm_medium, utm_campaign, utm_term, utm_content e touch_sequence.
- **leads**: identificador e tenant; não guardam UTM diretamente (vem de utm_attributions).
- **google_ads_accounts**: contas conectadas do tenant (external_id = customer id).
- **campaign_snapshots**: campanhas conhecidas por (tenant_id, google_ads_account_id, external_campaign_id, campaign_name).

### 2.2 Regra de vínculo (last-touch) — refinada

- **Toque considerado**: para cada lead, usa-se o **last-touch** (maior `touch_sequence` em utm_attributions). Representa o último clique/touch antes da conversão.
- **Indicação de Google Ads**: o last-touch só entra na atribuição se `utm_source` for compatível com Google (ex.: `trim(lower(utm_source)) LIKE 'google%'`).
- **Prioridade de match** (hierarquia explícita):
  1. **Match exato por ID**: `utm_campaign = campaign.external_campaign_id`. Se **exatamente uma** campanha casar → **exact_match**; o lead é atribuído a essa campanha.
  2. **Match por nome (fallback)**: só é usado se não houver match por ID. `trim(lower(utm_campaign)) = trim(lower(campaign_name))`. Se **exatamente uma** campanha casar → **name_match**; o lead é atribuído a essa campanha.
  3. Se houver **mais de um** match por ID ou mais de um por nome → **ambiguous**; o lead **não** é atribuído a nenhuma campanha na visão principal.
  4. Se não houver nenhum match → **unmatched**.
- **Unicidade**: na visão principal, cada lead conta no máximo uma vez (em exact_match ou name_match de uma única campanha). Ambíguos e sem match não inflam totais por campanha.

### 2.3 Regra temporal

- **Janela única**: métricas Ads (gasto, cliques, impressões) e leads atribuídos usam a **mesma janela** (ex.: últimos N dias).
- **Filtro de leads**: só entram na atribuição leads com **first_seen_at** no período: `first_seen_at >= (current_date - periodDays)::timestamp` e `first_seen_at < (current_date + 1 day)::timestamp`.
- **Last-touch**: nesse conjunto, aplica-se last-touch e prioridade de match (exact → name → ambiguous → unmatched).
- **Objetivo**: custo e leads na mesma janela para comparação e CPL indicativo temporalmente consistentes.

### 2.4 Quando é “inferido” e quando é “direto”

- **Inferido**: todo esse modelo é inferido. O Google Ads não envia lead_id; o vínculo é sempre por coincidência de UTM (utm_source + utm_campaign) com as campanhas que temos em campaign_snapshots.
- **Direto**: não existe nesta versão. Uma atribuição “direta” no futuro exigiria, por exemplo, Google Ads API (e.g. conversion upload com gclid) ou outro mecanismo que una click_id a lead_id.

Na UI, isso deve ficar explícito (ex.: “Atribuição inferida por last-touch UTM”).

---

## 3. Persistência vs cálculo on-the-fly

### 3.1 Escolha: **cálculo on-the-fly** (sem tabela de atribuição)

- A primeira versão **não persiste** uma tabela de attribution/result; os números são calculados nas queries a cada leitura.

### 3.2 Justificativa

- **Simplicidade**: uma única regra no código; não há job de sincronização nem triggers.
- **Consistência**: a mesma regra é sempre aplicada; não há estado desatualizado (novos leads ou novas campanhas entram na hora).
- **Transparência**: fica claro que o número é “quem hoje atende à regra UTM”, não um dado histórico gravado em outro lugar.
- **Menos superfície de erro**: não precisamos decidir quando recalcular (novo lead, edição de UTM, renomeação de campanha, etc.).
- **Custo**: o custo é um JOIN + agregação por request; para primeiro uso e volume moderado é aceitável. Se no futuro o volume ou a complexidade crescer, pode-se introduzir uma tabela ou view materializada.

---

## 4. Arquivos criados/alterados e responsabilidades

### server/dashboard/attribution.ts (criado / refinado)

| Responsabilidade |
|------------------|
| **getCampaignAttributionForTenant(tenantId, options?)**: retorna **CampaignAttributionResult** com **campaigns** e **summary**. Por campanha: **exactMatchLeadCount**, **nameMatchLeadCount**, **attributedLeadCount** (exact + name), spend, clicks, impressions. **summary**: totalExactMatch, totalNameMatch, totalAmbiguous, totalUnmatched. Classificação em aplicação: last-touch + lista de campanhas; prioridade ID → nome; múltiplos matches → ambiguous. **Regra temporal**: apenas leads com first_seen_at na janela (mesmo período das métricas). Cálculo on-the-fly; sem persistência. |

### server/dashboard/index.ts (alterado)

| Responsabilidade |
|------------------|
| Exporta **getCampaignAttributionForTenant** e tipos **CampaignAttributionRow**, **CampaignAttributionResult**, **AttributionSummary**, **AttributionMatchType**, **CampaignAttributionOptions**. |

### app/(dashboard)/google-ads/page.tsx (alterado)

| Responsabilidade |
|------------------|
| Seção **“Atribuição Ads → Leads”**: usa **attributionResult.campaigns** e **attributionResult.summary**. Seletor de período (7/30/90 dias) na query string. Tabela com Campanha, Conta, **Exato**, **Por nome**, **Total**, Gasto, **CPL (ind.)**, Cliques, Impr. Resumo acima da tabela: totais Exato (ID), Por nome, Ambíguos, Sem match. Texto: gasto/cliques/impressões e leads atribuídos são do mesmo período (first_seen_at na janela); CPL na janela é indicativo. |

---

## 5. Queries principais (refinado)

### 5.1 Last-touch por lead (fonte Google, janela temporal)

- **leads_in_period**: `SELECT id FROM leads WHERE tenant_id = $1 AND first_seen_at >= (current_date - periodDays)::timestamp AND first_seen_at < (current_date + interval '1 day')::timestamp`.
- **last_touch**: de `utm_attributions` com `tenant_id`, `utm_source LIKE 'google%'` e `lead_id IN (leads_in_period)`; depois `ROW_NUMBER() OVER (PARTITION BY lead_id ORDER BY touch_sequence DESC)` e `WHERE rn = 1`. Retorna `lead_id`, `utm_campaign`.

### 5.2 Campanhas distintas

- `DISTINCT ON (google_ads_account_id, external_campaign_id)` em campaign_snapshots + join google_ads_accounts (tenant_id).

### 5.3 Métricas por campanha no período

- Mesma agregação já usada em analytics: `campaign_snapshots` + join `google_ads_accounts`, filtro por tenant_id e `period_start >= current_date - (periodDays * interval '1 day')`, `SUM` de cost/costMicros, clicks, impressions, `GROUP BY` conta + campanha.

### 5.4 Classificação e agregação (em código)

- Para cada (lead_id, utm_campaign): match por ID (utm_campaign = external_campaign_id). Se 1 campanha → exact_match; se >1 → ambiguous. Se 0 por ID, match por nome normalizado; se 1 → name_match; se >1 → ambiguous; se 0 → unmatched.
- Contadores por campaignKey: exactCount, nameCount; totais totalAmbiguous, totalUnmatched.
- Merge com métricas por (account_id, external_campaign_id).

### 5.5 Período na UI e CPL (front)

- **Período**: searchParams.period (7 | 30 | 90); default 30. Links “7 dias”, “30 dias”, “90 dias” atualizam a URL; attributionPeriodUrl(days) preserva accountId, periodFrom, periodTo, page. O mesmo periodDays é passado a getCampaignAttributionForTenant (métricas e leads na mesma janela).
- **CPL**: calculado na UI por campanha como spend / attributedLeadCount. Exibido só quando attributedLeadCount > 0; caso contrário “—”. Coluna “CPL (ind.)”; tooltip e texto deixam claro que é indicativo e baseado em atribuição inferida por UTM.

**Regras de exibição do CPL:** (1) CPL = spend ÷ attributedLeadCount por campanha. (2) Só exibir quando attributedLeadCount > 0; senão “—”. (3) Rotular como “CPL (ind.)” e explicar em texto/tooltip que é indicativo e baseado em atribuição inferida por UTM, não dado oficial do Google.

---

## 6. Classificação da atribuição (buckets)

- **exact_match**: lead atribuído por match exato de utm_campaign com external_campaign_id (um único match).
- **name_match**: lead atribuído apenas por match de utm_campaign com campaign_name normalizado (um único match; usado só quando não há match por ID).
- **ambiguous**: mais de um match possível (por ID ou por nome); lead **não** entra na visão principal (não é atribuído a nenhuma campanha).
- **unmatched**: fonte Google mas nenhum match (utm_campaign vazio ou não casa com nenhuma campanha).

A resposta da API e a UI expõem esses totais para leitura honesta e operacionalmente confiável.

---

## 7. Impacto esperado na qualidade da leitura

- **Números não inflados**: cada lead conta no máximo uma vez; ambíguos ficam explícitos e fora do “Total” por campanha.
- **Prioridade clara**: exato (ID) é mais confiável; por nome é fallback e visível na coluna “Por nome”.
- **Transparência**: totais “Ambíguos” e “Sem match” permitem ao tenant ver o que não foi atribuído e ajustar tagging (ex.: usar campaign ID no UTM para reduzir ambiguidade).
- **Visão principal**: a coluna “Total” (exact + name por campanha) pode ser usada como referência operacional sem duplicação.
- **Consistência temporal**: gasto, cliques, impressões e leads atribuídos referem-se à mesma janela (first_seen_at no período); a comparação custo vs. leads e um CPL indicativo passam a ser coerentes no tempo.

---

## 8. Limitações remanescentes

- **Só last-touch**: não há first-touch nem multi-touch.
- **Dependência de UTM**: leads sem UTM ou com utm_source diferente de “google%” não entram; tagging inconsistente subestima.
- **Match por nome frágil**: renomeações ou diferenças de encoding podem quebrar o name_match; preferir utm_campaign = ID da campanha quando possível.
- **Período**: métricas e leads atribuídos usam a mesma janela (ex.: últimos 30 dias); leads filtrados por first_seen_at no período. CPL na janela é indicativo, não oficial.
- **Sem IA e sem APIs**: nenhum modelo de ML e nenhuma chamada à API do Google para atribuição.
- **Ambíguos não distribuídos**: leads ambíguos não são atribuídos a nenhuma campanha; não há regra de “desempate”.

---

## 9. Riscos de interpretação

- **Causação**: a contagem indica “leads cujo último toque UTM casa com esta campanha (de forma única)”, não “leads que essa campanha causou”.
- **Precisão**: não é número oficial do Google; é estimativa operacional.
- **CPL**: custo e leads estão na mesma janela (first_seen_at no período); CPL na tela é indicativo para essa janela.
- **Ambíguos**: representam leads que poderiam ser de mais de uma campanha; não entram no total por campanha.

---

## 10. Resumo

- **Regra refinada**: prioridade 1) match exato por external_campaign_id, 2) match por campaign_name normalizado (fallback). Múltiplos matches → ambiguous (não atribuído). Um lead conta no máximo uma vez.
- **Regra temporal**: apenas leads com first_seen_at na janela selecionada; mesma janela das métricas Ads. Custo vs. leads alinhados para CPL indicativo.
- **Classificação**: exact_match, name_match, ambiguous, unmatched; expostos na API e na UI.
- **Implementação**: cálculo on-the-fly em **getCampaignAttributionForTenant**; retorno **CampaignAttributionResult** (campaigns + summary); superfície na página Google Ads com colunas Exato / Por nome / Total e resumo de totais; texto explicando mesma janela temporal.
- **Período na UI**: seletor 7 / 30 / 90 dias; parâmetro `period` na query string; aplicado às métricas Ads e aos leads atribuídos (lógica já aprovada).
- **CPL indicativo**: por campanha, CPL = spend / attributedLeadCount; exibido apenas quando attributedLeadCount > 0; na UI rotulado como "CPL (ind.)" com tooltip e texto explicando que é indicativo e baseado em atribuição inferida por UTM.
- **Próximos passos possíveis**: persistência em tabela/view materializada se o volume exigir; multi-touch ou integração com conversion upload (gclid).

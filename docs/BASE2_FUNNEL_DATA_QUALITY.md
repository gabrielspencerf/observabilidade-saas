# Qualidade dos dados do funil e jornada

Regras e implementação para que processadores e eventos preencham melhor `current_funnel_step_id` (lead) e `lead_events.funnel_step_id`, tornando a visão de funil e a jornada do lead mais completas e confiáveis.

---

## 1. Proposta de regra

### 1.1 Onde o funil e a etapa do lead são atualizados

- **Lead:** `leads.funnel_id` e `leads.current_funnel_step_id` são atualizados apenas por processadores que interpretam eventos de origem (ex.: Typebot). Não há tela de edição manual do funil/etapa do lead nesta versão.
- **Evento:** `lead_events.funnel_step_id` é preenchido no mesmo momento em que o processador cria o evento, quando houver etapa resolvida a partir do payload.

### 1.2 Resolução de etapa (payload → etapa)

- Usa o **primeiro funil ativo** do tenant (`funnels.is_active = true`, ordenado por nome) como funil padrão.
- A etapa é resolvida por **criteria** em `funnel_steps.criteria` (JSONB), sem nova modelagem:
  - **typebotBlockId:** valor esperado do `blockId` ou `block_id` no payload (ex.: webhook Typebot envia o block que disparou).
  - **typebotVariable** + **typebotValue:** nome e valor de uma variável em `payload.variables` (ex.: variável “funnel_step” = “Contato”).
- A **primeira etapa** (por `sort_order`) cujo criteria casa com o payload é a etapa resolvida. Se nenhuma casar, não há etapa para este evento.

### 1.3 Regra de atualização de `current_funnel_step_id` (evitar regressão)

- **Só avançar ou setar; nunca regredir:**
  - Lead **sem funil:** pode setar `funnel_id` e `current_funnel_step_id`.
  - **Mesmo funil:** atualiza `current_funnel_step_id` somente se a nova etapa tiver `sort_order >=` da etapa atual (avance ou permaneça na mesma).
  - **Outro funil:** não altera (evita sobrescrever o contexto de outro funil).
- **Idempotência:** reprocessar o mesmo raw event não deve regredir a etapa; o evento não é inserido de novo (dedup por `_rawEventId`) e o update do lead só aplica se `shouldAdvanceLeadStep` for verdadeiro.

### 1.4 Quando a etapa pode avançar, permanecer ou ficar nula

| Situação | Efeito em `current_funnel_step_id` |
|----------|-------------------------------------|
| Lead sem funil + etapa resolvida | Seta funil + etapa. |
| Mesmo funil + etapa resolvida com `sort_order` maior ou igual ao atual | Avança (ou permanece) para a nova etapa. |
| Mesmo funil + etapa resolvida com `sort_order` menor | Não altera (evita regressão). |
| Lead em outro funil | Não altera. |
| Nenhuma etapa resolvida (criteria não casa) | Não altera. |
| Lead novo + etapa resolvida | Seta funil + etapa no insert. |
| Lead novo + nenhuma etapa resolvida | `funnel_id` e `current_funnel_step_id` ficam nulos. |

A etapa só fica **nula** se o lead nunca recebeu uma etapa (ou se a etapa foi removida no banco, por FK `on delete set null`). Não zeramos etapa por regra de negócio.

### 1.5 Eventos de jornada

- Todo evento criado por um processador que resolve etapa deve preencher `lead_events.funnel_step_id` com a etapa resolvida (quando houver).
- `event_type` permanece o do processador (ex.: `typebot_webhook`). Padronização adicional de `event_type` por etapa pode ser feita em evolução futura.

---

## 2. Arquivos alterados

| Arquivo | Alteração |
|--------|------------|
| `src/server/funnel/resolve-step.ts` | **Novo.** `getActiveFunnelForTenant`, `resolveStepFromTypebotPayload` (criteria typebotBlockId / typebotVariable+typebotValue), `shouldAdvanceLeadStep`. |
| `src/workers/processors/typebot.ts` | Resolve etapa antes de criar/atualizar lead; ao atualizar lead existente, carrega `funnelId` e `currentFunnelStepId` + sortOrder (join `funnel_steps`); aplica avanço só se `shouldAdvanceLeadStep`; no insert do lead novo, preenche `funnelId` e `currentFunnelStepId` quando há etapa; no insert de `lead_events`, preenche `funnel_step_id` quando há etapa. |
| `docs/BASE2_FUNNEL_DATA_QUALITY.md` | Este documento. |

---

## 3. Fluxo de atualização do lead e dos eventos

```
[Webhook Typebot] → Raw event (typebot_webhook_events)
        ↓
processTypebotRaw
        ↓
1) resolveStepFromTypebotPayload(tenantId, payload)
   → Funil ativo do tenant → etapas ordenadas por sort_order
   → Primeira etapa cujo criteria casa com payload
   → Retorna { funnelId, funnelStepId, sortOrder } ou null
        ↓
2) Lead existente? (por tenant_id + source_provider + source_external_id)
   SIM → SELECT lead + funnel_steps.sort_order (join)
         → canAdvance = resolvedStep && shouldAdvanceLeadStep(currentFunnelId, currentSortOrder, newFunnelId, newSortOrder)
         → UPDATE leads SET lastSeenAt, ... , (se canAdvance: funnelId, currentFunnelStepId)
   NÃO → INSERT leads (se resolvedStep: funnelId, currentFunnelStepId)
        ↓
3) Dedup evento por (lead_id, payload._rawEventId)
   Se novo → INSERT lead_events (eventType, payload, occurredAt, (se resolvedStep: funnel_step_id))
        ↓
4) Marcar raw event como processado
```

- **Lead:** atualizado no passo 2 (create ou update), com regra de só avançar.
- **Evento:** criado no passo 3, sempre com `funnel_step_id` quando há etapa resolvida.

---

## 4. Impacto esperado na visão de funil e jornada

- **Visão de funil:** Mais leads com `funnel_id` e `current_funnel_step_id` preenchidos desde o processamento Typebot (desde que o tenant tenha um funil ativo e etapas com criteria configurados). Volumes por etapa e “sem etapa” passam a refletir melhor a progressão real.
- **Jornada do lead:** Na tela de detalhe do lead, a “Etapa atual” e a coluna de etapa nos eventos passam a ser preenchidas quando os webhooks Typebot casam com os criteria das etapas. A leitura da passagem do lead pelas etapas ao longo do tempo fica mais completa e confiável.

Sem configurar `funnel_steps.criteria` (ou sem funil ativo), o comportamento permanece o anterior: lead e eventos sem funil/etapa.

---

## 5. Limitações remanescentes

- **Um funil ativo por tenant:** A resolução usa apenas o primeiro funil ativo. Múltiplos funis ativos com mapeamentos distintos exigiriam vínculo explícito (ex.: integração → funil) em evolução futura.
- **Apenas Typebot:** A lógica de resolução e avanço está implementada no processador Typebot. Outros processadores (ex.: Evolution) não preenchem funnel/etapa; podem ser estendidos reutilizando `resolve-step` ou convenções equivalentes.
- **Criteria fixos no schema:** O formato de `criteria` (typebotBlockId, typebotVariable, typebotValue) é convenção de aplicação, não validada por schema. Novas origens (ex.: outro provedor) podem exigir novos campos em criteria ou outro mecanismo.
- **Payload Typebot:** O casamento depende do payload enviado pelo Typebot (ex.: `blockId` ou variáveis). Se o webhook não enviar esses campos, nenhuma etapa será resolvida.
- **Sem zerar etapa:** Não há regra para “sair do funil” ou colocar etapa em nulo por evento; apenas avanço ou manutenção dentro do mesmo funil.

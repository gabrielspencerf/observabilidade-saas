# Base 2 — Detalhe operacional de Lead e Conversation

## 1. Objetivo

Permitir drill-down a partir das listagens de leads e conversas: páginas de detalhe tenant-scoped para inspecionar a jornada do lead e a timeline da conversa. Sem edição manual; foco em inspeção e validação operacional.

---

## 2. Arquivos criados/alterados e responsabilidades

### server/dashboard/lead-detail.ts (novo)

| Responsabilidade |
|------------------|
| `getLeadDetailForTenant(tenantId, leadId)`. Retorna `LeadDetail \| null`. Garante `tenant_id` na busca do lead; 404 implícito (caller usa notFound()). Carrega em paralelo: lead (dados principais), utm_attributions (ordenado por touch_sequence), lead_events (ordenado por occurred_at), conversas vinculadas (conversations onde lead_id = leadId, join evolution_instances para instanceDisplay). |

### server/dashboard/conversation-detail.ts (novo)

| Responsabilidade |
|------------------|
| `getConversationDetailForTenant(tenantId, conversationId)`. Retorna `ConversationDetail \| null`. Uma query: conversations JOIN evolution_instances LEFT JOIN leads, WHERE tenant_id e conversation.id. Segunda query: conversation_messages WHERE conversation_id ORDER BY sent_at. Retorna null se a conversa não existir ou não for do tenant. |

### server/dashboard/index.ts (alterado)

| Responsabilidade |
|------------------|
| Exporta `getLeadDetailForTenant`, `getConversationDetailForTenant` e tipos `LeadDetail`, `LeadDetailUtm`, `LeadDetailEvent`, `LeadDetailConversation`, `ConversationDetail`, `ConversationDetailMessage`. |

### app/(dashboard)/leads/[id]/page.tsx (novo)

| Responsabilidade |
|------------------|
| Página de detalhe do lead. Chama `getDashboardTenantContext()` e `getLeadDetailForTenant(tenantId, params.id)`. Se null → `notFound()`. Exibe: link "Voltar para Leads"; título (nome ou email ou phone); bloco "Dados principais" (nome, email, telefone, status, origem, source_external_id, first_seen_at, last_seen_at); bloco "UTM (atribuição)" (tabela com touch_type, touch_sequence, touched_at, utm_*); bloco "Jornada (eventos)" (lista de eventos por occurred_at com eventType, occurredAt, payload quando relevante); bloco "Conversas vinculadas" (links para /dashboard/conversations/[id] com externalId, instanceDisplay, status, startedAt). |

### app/(dashboard)/conversations/[id]/page.tsx (novo)

| Responsabilidade |
|------------------|
| Página de detalhe da conversa. Chama `getDashboardTenantContext()` e `getConversationDetailForTenant(tenantId, params.id)`. Se null → `notFound()`. Exibe: link "Voltar para Conversas"; título (external_id); bloco "Dados principais" (external_id, instância, status, started_at, last_synced_at, lead vinculado com link para /dashboard/leads/[leadId]); bloco "Mensagens" (timeline por sent_at com direction, contentType, contentText, sentAt). |

### app/(dashboard)/leads/page.tsx (alterado)

| Responsabilidade |
|------------------|
| Primeira coluna da tabela passa a ser link para `/dashboard/leads/[id]` com texto nome ?? email ?? phone ?? id. |

### app/(dashboard)/conversations/page.tsx (alterado)

| Responsabilidade |
|------------------|
| Import de Link; célula do identificador (external_id) passa a ser link para `/dashboard/conversations/[id]`. |

---

## 3. Queries principais

### Lead detail

1. **Lead:** `SELECT id, name, email, phone, status, source_provider, source_external_id, first_seen_at, last_seen_at FROM leads WHERE tenant_id = $1 AND id = $2 LIMIT 1`.
2. **UTM:** `SELECT id, touch_type, touch_sequence, touched_at, utm_source, utm_medium, utm_campaign, utm_term, utm_content FROM utm_attributions WHERE lead_id = $1 ORDER BY touch_sequence ASC`.
3. **Eventos:** `SELECT id, event_type, occurred_at, payload FROM lead_events WHERE lead_id = $1 ORDER BY occurred_at ASC`.
4. **Conversas vinculadas:** `SELECT c.id, c.external_id, c.status, c.started_at, ei.instance_name, ei.external_id AS instance_external_id FROM conversations c INNER JOIN evolution_instances ei ON c.evolution_instance_id = ei.id WHERE c.tenant_id = $1 AND c.lead_id = $2 ORDER BY c.started_at DESC`.

### Conversation detail

1. **Conversa + instância + lead:** `SELECT c.id, c.external_id, c.status, c.started_at, c.last_synced_at, c.lead_id, ei.instance_name, ei.external_id AS instance_external_id, l.name AS lead_name, l.email AS lead_email FROM conversations c INNER JOIN evolution_instances ei ON c.evolution_instance_id = ei.id LEFT JOIN leads l ON c.lead_id = l.id WHERE c.tenant_id = $1 AND c.id = $2 LIMIT 1`.
2. **Mensagens:** `SELECT id, direction, content_type, content_text, sent_at FROM conversation_messages WHERE conversation_id = $1 ORDER BY sent_at ASC`.

---

## 4. Acesso e escopo

- **Tenant:** Sempre da sessão via `getDashboardTenantContext()`; nunca do frontend.
- **Autorização:** Lead/conversation carregados com `tenant_id` na cláusula WHERE; se não existir ou não pertencer ao tenant, a função retorna null e a página chama `notFound()` (404).
- **Layout:** Páginas de detalhe usam o mesmo layout das listagens (leads/layout.tsx e conversations/layout.tsx), com DashboardShell e nav.

---

## 5. Navegação

- Listagem de leads: primeira coluna (nome/email/telefone) é link para `/dashboard/leads/[id]`.
- Listagem de conversas: identificador (external_id) é link para `/dashboard/conversations/[id]`.
- Detalhe do lead: link "Voltar para Leads"; lista "Conversas vinculadas" com links para `/dashboard/conversations/[id]`.
- Detalhe da conversa: link "Voltar para Conversas"; "Lead vinculado" com link para `/dashboard/leads/[leadId]`.

---

## 6. Limitações desta primeira versão

- **Sem edição:** Apenas leitura; não há formulários para alterar status, dados do lead ou da conversa.
- **Payload de eventos:** Exibição de payload em JSON; não há ocultação sistemática de campos internos (ex.: _rawEventId) além do caso mínimo na UI.
- **Mensagens:** Apenas content_text e contentType na timeline; mídia (imagem, áudio) não é exibida, apenas tipo.
- **Paginação:** Timeline de eventos e de mensagens sem paginação (todos carregados).
- **Conversas vinculadas ao lead:** Lista todas as conversas com aquele lead_id; não há limite.

---

## 7. Resumo

- **Rotas:** `/dashboard/leads/[id]` (detalhe do lead com UTM, eventos e conversas) e `/dashboard/conversations/[id]` (detalhe da conversa com lead e mensagens).
- **Dados:** Sempre tenant da sessão; lead/conversation filtrados por tenant; 404 quando recurso não existe ou não pertence ao tenant.
- **Links:** Listagens levam ao detalhe; detalhe do lead lista conversas; detalhe da conversa linka ao lead quando houver.

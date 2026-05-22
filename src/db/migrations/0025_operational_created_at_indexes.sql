-- Índices compostos `(tenant_id, created_at DESC)` em tabelas operacionais
-- que listam por mais recente. Sem esses índices, a query usa o índice
-- `*_tenant_idx` (sem `created_at`) + filesort em memória, lento em tenants
-- com milhares de registros.
--
-- Tabelas cobertas (já tinham só `tenant_idx`):
-- - complaints
-- - contacts
-- - opportunities
-- - products
--
-- Já existem (não tocadas):
-- - leads → tenant_first_seen_idx
-- - conversations → tenant_started_idx
-- - conversation_messages → tenant_sent_idx
-- - internal_notifications → tenant_created_idx
-- - audit_logs → tenant_occurred_idx
-- - ai_classifications → tenant_processed_idx
-- - processing_failures → tenant_failed_idx
-- - vysen_usage_events → tenant_created_idx
--
-- Sintaxe: `... DESC` faz parte do índice; queries com `ORDER BY created_at DESC`
-- usam ele direto. IF NOT EXISTS para idempotência.

CREATE INDEX IF NOT EXISTS "complaints_tenant_created_idx"
ON "complaints" USING btree ("tenant_id", "created_at" DESC);

CREATE INDEX IF NOT EXISTS "contacts_tenant_created_idx"
ON "contacts" USING btree ("tenant_id", "created_at" DESC);

CREATE INDEX IF NOT EXISTS "opportunities_tenant_created_idx"
ON "opportunities" USING btree ("tenant_id", "created_at" DESC);

CREATE INDEX IF NOT EXISTS "products_tenant_created_idx"
ON "products" USING btree ("tenant_id", "created_at" DESC);

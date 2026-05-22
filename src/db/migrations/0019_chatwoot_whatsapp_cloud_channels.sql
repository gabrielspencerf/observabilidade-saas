-- Migration: 0019 — Chatwoot e WhatsApp Cloud como canais nativos
-- Ordem: additive primeiro (novas tabelas + colunas nullable), constraint no final.

-- 1. Estender enum de provedores
ALTER TYPE provider_enum ADD VALUE IF NOT EXISTS 'chatwoot';
ALTER TYPE provider_enum ADD VALUE IF NOT EXISTS 'whatsapp_cloud';

-- 2. Tabela de contas Chatwoot por tenant
CREATE TABLE IF NOT EXISTS chatwoot_accounts (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id           UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  external_id         VARCHAR(64) NOT NULL,
  base_url            VARCHAR(512) NOT NULL,
  api_token_encrypted TEXT,
  inbox_id            VARCHAR(64),
  label               VARCHAR(255),
  last_synced_at      TIMESTAMPTZ(6),
  last_sync_error     VARCHAR(1024),
  created_at          TIMESTAMPTZ(6) NOT NULL DEFAULT now(),
  updated_at          TIMESTAMPTZ(6) NOT NULL DEFAULT now(),
  CONSTRAINT chatwoot_accounts_tenant_external_unique UNIQUE (tenant_id, external_id)
);

CREATE INDEX IF NOT EXISTS chatwoot_accounts_tenant_external_idx
  ON chatwoot_accounts (tenant_id, external_id);

-- 3. Tabela de números WhatsApp Cloud por tenant
CREATE TABLE IF NOT EXISTS whatsapp_cloud_numbers (
  id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id               UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  phone_number_id         VARCHAR(64) NOT NULL,
  waba_id                 VARCHAR(64) NOT NULL,
  display_phone           VARCHAR(32),
  access_token_encrypted  TEXT,
  webhook_verify_token    VARCHAR(255),
  label                   VARCHAR(255),
  last_synced_at          TIMESTAMPTZ(6),
  last_sync_error         VARCHAR(1024),
  created_at              TIMESTAMPTZ(6) NOT NULL DEFAULT now(),
  updated_at              TIMESTAMPTZ(6) NOT NULL DEFAULT now(),
  CONSTRAINT wc_numbers_tenant_phone_unique UNIQUE (tenant_id, phone_number_id)
);

CREATE INDEX IF NOT EXISTS wc_numbers_tenant_phone_idx
  ON whatsapp_cloud_numbers (tenant_id, phone_number_id);

-- 4. Tabela de raw events Chatwoot (append-only)
CREATE TABLE IF NOT EXISTS chatwoot_webhook_events (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id            UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  chatwoot_account_id  UUID NOT NULL REFERENCES chatwoot_accounts(id) ON DELETE CASCADE,
  external_event_id    VARCHAR(255),
  event_type           VARCHAR(64) NOT NULL,
  payload              JSONB NOT NULL,
  received_at          TIMESTAMPTZ(6) NOT NULL,
  processed_at         TIMESTAMPTZ(6),
  processing_error     VARCHAR(1024)
);

CREATE INDEX IF NOT EXISTS chatwoot_webhook_events_tenant_received_idx
  ON chatwoot_webhook_events (tenant_id, received_at);

CREATE INDEX IF NOT EXISTS chatwoot_webhook_events_account_received_idx
  ON chatwoot_webhook_events (chatwoot_account_id, received_at);

CREATE INDEX IF NOT EXISTS chatwoot_webhook_events_processed_idx
  ON chatwoot_webhook_events (processed_at);

CREATE UNIQUE INDEX IF NOT EXISTS chatwoot_webhook_events_dedup_unique
  ON chatwoot_webhook_events (tenant_id, chatwoot_account_id, external_event_id)
  WHERE external_event_id IS NOT NULL;

-- 5. Tabela de raw events WhatsApp Cloud (append-only)
CREATE TABLE IF NOT EXISTS whatsapp_cloud_webhook_events (
  id                        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id                 UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  whatsapp_cloud_number_id  UUID NOT NULL REFERENCES whatsapp_cloud_numbers(id) ON DELETE CASCADE,
  external_event_id         VARCHAR(255),
  event_type                VARCHAR(64) NOT NULL,
  payload                   JSONB NOT NULL,
  received_at               TIMESTAMPTZ(6) NOT NULL,
  processed_at              TIMESTAMPTZ(6),
  processing_error          VARCHAR(1024)
);

CREATE INDEX IF NOT EXISTS wc_webhook_events_tenant_received_idx
  ON whatsapp_cloud_webhook_events (tenant_id, received_at);

CREATE INDEX IF NOT EXISTS wc_webhook_events_number_received_idx
  ON whatsapp_cloud_webhook_events (whatsapp_cloud_number_id, received_at);

CREATE INDEX IF NOT EXISTS wc_webhook_events_processed_idx
  ON whatsapp_cloud_webhook_events (processed_at);

CREATE UNIQUE INDEX IF NOT EXISTS wc_webhook_events_dedup_unique
  ON whatsapp_cloud_webhook_events (tenant_id, whatsapp_cloud_number_id, external_event_id)
  WHERE external_event_id IS NOT NULL;

-- 6. Expandir conversations com novos canais (additive — nullable)
ALTER TABLE conversations
  ADD COLUMN IF NOT EXISTS chatwoot_account_id UUID
    REFERENCES chatwoot_accounts(id) ON DELETE CASCADE;

ALTER TABLE conversations
  ADD COLUMN IF NOT EXISTS whatsapp_cloud_number_id UUID
    REFERENCES whatsapp_cloud_numbers(id) ON DELETE CASCADE;

-- 7. Novos índices únicos parciais em conversations
CREATE UNIQUE INDEX IF NOT EXISTS conversations_tenant_chatwoot_external_unique
  ON conversations (tenant_id, chatwoot_account_id, external_id)
  WHERE chatwoot_account_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS conversations_tenant_wc_external_unique
  ON conversations (tenant_id, whatsapp_cloud_number_id, external_id)
  WHERE whatsapp_cloud_number_id IS NOT NULL;

-- 8. Substituir constraint de origem única para incluir novos canais
--    (drop da antiga + nova com num_nonnulls para cobrir os 4 canais)
ALTER TABLE conversations
  DROP CONSTRAINT IF EXISTS conversations_instance_check;

ALTER TABLE conversations
  ADD CONSTRAINT conversations_instance_check CHECK (
    num_nonnulls(
      evolution_instance_id,
      uazapi_instance_id,
      chatwoot_account_id,
      whatsapp_cloud_number_id
    ) = 1
  );

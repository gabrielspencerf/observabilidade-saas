-- Contas Meta Ads (Marketing API) + snapshots de insights diários (nível conta).
-- Conexões Clarity (token por projeto) + snapshots JSON da Data Export API.

CREATE TABLE IF NOT EXISTS "meta_ads_accounts" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "tenant_id" uuid NOT NULL REFERENCES "tenants"("id") ON DELETE CASCADE,
  "external_id" varchar(64) NOT NULL,
  "long_lived_token_encrypted" text NOT NULL,
  "token_expires_at" timestamp(6) with time zone,
  "label" varchar(255),
  "currency_code" varchar(8),
  "pixel_id" varchar(64),
  "last_synced_at" timestamp(6) with time zone,
  "last_sync_error" varchar(1024),
  "created_at" timestamp(6) with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp(6) with time zone DEFAULT now() NOT NULL,
  CONSTRAINT "meta_ads_accounts_tenant_external_unique" UNIQUE ("tenant_id", "external_id")
);

CREATE INDEX IF NOT EXISTS "meta_ads_accounts_tenant_external_idx"
  ON "meta_ads_accounts" ("tenant_id", "external_id");

CREATE TABLE IF NOT EXISTS "meta_ads_insight_snapshots" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "tenant_id" uuid NOT NULL REFERENCES "tenants"("id") ON DELETE CASCADE,
  "meta_ads_account_id" uuid NOT NULL REFERENCES "meta_ads_accounts"("id") ON DELETE CASCADE,
  "insight_date" date NOT NULL,
  "metrics" jsonb NOT NULL,
  "synced_at" timestamp(6) with time zone NOT NULL,
  "created_at" timestamp(6) with time zone DEFAULT now() NOT NULL,
  CONSTRAINT "meta_ads_insight_snapshots_unique_day" UNIQUE ("tenant_id", "meta_ads_account_id", "insight_date")
);

CREATE INDEX IF NOT EXISTS "meta_ads_insight_snapshots_tenant_date_idx"
  ON "meta_ads_insight_snapshots" ("tenant_id", "insight_date");

CREATE TABLE IF NOT EXISTS "meta_ads_sync_logs" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "tenant_id" uuid NOT NULL REFERENCES "tenants"("id") ON DELETE CASCADE,
  "meta_ads_account_id" uuid NOT NULL REFERENCES "meta_ads_accounts"("id") ON DELETE CASCADE,
  "sync_started_at" timestamp(6) with time zone NOT NULL,
  "sync_finished_at" timestamp(6) with time zone,
  "status" varchar(32) NOT NULL,
  "request_params" jsonb,
  "response_summary" jsonb,
  "error_message" varchar(1024)
);

CREATE INDEX IF NOT EXISTS "meta_ads_sync_logs_tenant_started_idx"
  ON "meta_ads_sync_logs" ("tenant_id", "sync_started_at");

CREATE INDEX IF NOT EXISTS "meta_ads_sync_logs_account_started_idx"
  ON "meta_ads_sync_logs" ("meta_ads_account_id", "sync_started_at");

CREATE TABLE IF NOT EXISTS "clarity_connections" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "tenant_id" uuid NOT NULL REFERENCES "tenants"("id") ON DELETE CASCADE,
  "label" varchar(255),
  "api_token_encrypted" text NOT NULL,
  "last_synced_at" timestamp(6) with time zone,
  "last_sync_error" varchar(1024),
  "created_at" timestamp(6) with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp(6) with time zone DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS "clarity_connections_tenant_idx"
  ON "clarity_connections" ("tenant_id");

CREATE TABLE IF NOT EXISTS "clarity_insight_snapshots" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "tenant_id" uuid NOT NULL REFERENCES "tenants"("id") ON DELETE CASCADE,
  "clarity_connection_id" uuid NOT NULL REFERENCES "clarity_connections"("id") ON DELETE CASCADE,
  "num_of_days" integer NOT NULL,
  "dimension1" varchar(64),
  "payload" jsonb NOT NULL,
  "synced_at" timestamp(6) with time zone NOT NULL,
  "created_at" timestamp(6) with time zone DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS "clarity_insight_snapshots_tenant_synced_idx"
  ON "clarity_insight_snapshots" ("tenant_id", "synced_at");

CREATE INDEX IF NOT EXISTS "clarity_insight_snapshots_connection_synced_idx"
  ON "clarity_insight_snapshots" ("clarity_connection_id", "synced_at");

-- RLS (mesmo padrão da migration 0016; tabelas novas não entram no DO $$ anterior).
DO $$
DECLARE
  t text;
  tables text[] := ARRAY[
    'meta_ads_accounts',
    'meta_ads_insight_snapshots',
    'meta_ads_sync_logs',
    'clarity_connections',
    'clarity_insight_snapshots'
  ];
BEGIN
  FOREACH t IN ARRAY tables
  LOOP
    EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', t);
    EXECUTE format('ALTER TABLE %I FORCE ROW LEVEL SECURITY', t);
    EXECUTE format('DROP POLICY IF EXISTS tenant_rls_policy ON %I', t);
    EXECUTE format(
      'CREATE POLICY tenant_rls_policy ON %I
         FOR ALL
         USING (
           coalesce(current_setting(''app.enforce_rls'', true), ''off'') <> ''on''
           OR coalesce(current_setting(''app.bypass_rls'', true), ''off'') = ''on''
           OR tenant_id = nullif(current_setting(''app.current_tenant_id'', true), '''')::uuid
         )
         WITH CHECK (
           coalesce(current_setting(''app.enforce_rls'', true), ''off'') <> ''on''
           OR coalesce(current_setting(''app.bypass_rls'', true), ''off'') = ''on''
           OR tenant_id = nullif(current_setting(''app.current_tenant_id'', true), '''')::uuid
         )',
      t
    );
  END LOOP;
END $$;

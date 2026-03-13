DO $$ BEGIN
  ALTER TYPE "provider_enum" ADD VALUE IF NOT EXISTS 'uazapi';
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

ALTER TABLE "typebot_bots"
ADD COLUMN IF NOT EXISTS "webhook_secret_encrypted" varchar(1024);

ALTER TABLE "typebot_bots"
ADD COLUMN IF NOT EXISTS "api_token_encrypted" varchar(1024);

ALTER TABLE "typebot_bots"
ADD COLUMN IF NOT EXISTS "metrics_api_base_url" varchar(512);

CREATE TABLE IF NOT EXISTS "uazapi_instances" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "tenant_id" uuid NOT NULL,
  "external_id" varchar(64) NOT NULL,
  "base_url" varchar(512) NOT NULL,
  "api_key_encrypted" text,
  "instance_name" varchar(255),
  "last_synced_at" timestamp (6) with time zone,
  "last_status" varchar(64),
  "created_at" timestamp (6) with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp (6) with time zone DEFAULT now() NOT NULL,
  CONSTRAINT "uazapi_instances_tenant_external_unique" UNIQUE("tenant_id", "external_id")
);

DO $$ BEGIN
  ALTER TABLE "uazapi_instances"
  ADD CONSTRAINT "uazapi_instances_tenant_id_tenants_id_fk"
  FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id")
  ON DELETE cascade ON UPDATE no action;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

CREATE INDEX IF NOT EXISTS "uazapi_instances_tenant_external_idx"
ON "uazapi_instances" USING btree ("tenant_id", "external_id");

CREATE UNIQUE INDEX IF NOT EXISTS "typebot_webhook_events_dedup_unique"
ON "typebot_webhook_events" USING btree ("tenant_id", "typebot_bot_id", "external_event_id")
WHERE "typebot_webhook_events"."external_event_id" IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS "evolution_webhook_events_dedup_unique"
ON "evolution_webhook_events" USING btree ("tenant_id", "evolution_instance_id", "external_event_id")
WHERE "evolution_webhook_events"."external_event_id" IS NOT NULL;

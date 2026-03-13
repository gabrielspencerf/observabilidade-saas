-- Configurações globais editáveis pela web (setup). Valores sensíveis em value_encrypted.
CREATE TABLE IF NOT EXISTS "app_global_config" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "key" varchar(128) NOT NULL UNIQUE,
  "value_plain" text,
  "value_encrypted" text,
  "is_sensitive" boolean NOT NULL DEFAULT false,
  "updated_at" timestamp(6) with time zone DEFAULT now() NOT NULL,
  "updated_by" uuid
);

ALTER TABLE "app_global_config" ADD CONSTRAINT "app_global_config_updated_by_users_id_fk"
  FOREIGN KEY ("updated_by") REFERENCES "public"."users"("id") ON DELETE SET NULL ON UPDATE NO ACTION;

CREATE INDEX IF NOT EXISTS "app_global_config_key_idx" ON "app_global_config" USING btree ("key");

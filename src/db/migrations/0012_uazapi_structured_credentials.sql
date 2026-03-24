ALTER TABLE "uazapi_instances"
ADD COLUMN IF NOT EXISTS "token_encrypted" text;

ALTER TABLE "uazapi_instances"
ADD COLUMN IF NOT EXISTS "admin_token_encrypted" text;

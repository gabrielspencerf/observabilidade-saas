-- Add currency_code to google_ads_accounts (ISO 4217, e.g. BRL, USD).
-- Populated during sync from Customer.currency_code when null.
ALTER TABLE "google_ads_accounts"
ADD COLUMN IF NOT EXISTS "currency_code" varchar(8);

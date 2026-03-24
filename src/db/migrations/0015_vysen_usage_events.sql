CREATE TABLE IF NOT EXISTS "vysen_usage_events" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "tenant_id" uuid,
  "user_id" uuid,
  "channel" varchar(24) NOT NULL,
  "operation" varchar(64) NOT NULL,
  "model" varchar(80),
  "prompt_tokens" integer DEFAULT 0 NOT NULL,
  "completion_tokens" integer DEFAULT 0 NOT NULL,
  "total_tokens" integer DEFAULT 0 NOT NULL,
  "success" boolean DEFAULT true NOT NULL,
  "error_message" varchar(500),
  "created_at" timestamp (6) with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "vysen_usage_events"
 ADD CONSTRAINT "vysen_usage_events_tenant_id_tenants_id_fk"
 FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id")
 ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "vysen_usage_events"
 ADD CONSTRAINT "vysen_usage_events_user_id_users_id_fk"
 FOREIGN KEY ("user_id") REFERENCES "public"."users"("id")
 ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "vysen_usage_events_created_idx"
ON "vysen_usage_events" USING btree ("created_at");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "vysen_usage_events_tenant_created_idx"
ON "vysen_usage_events" USING btree ("tenant_id","created_at");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "vysen_usage_events_user_created_idx"
ON "vysen_usage_events" USING btree ("user_id","created_at");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "vysen_usage_events_channel_op_idx"
ON "vysen_usage_events" USING btree ("channel","operation","created_at");


CREATE TABLE IF NOT EXISTS "internal_notifications" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "tenant_id" uuid NOT NULL,
  "user_id" uuid,
  "type" varchar(64) NOT NULL,
  "title" varchar(160) NOT NULL,
  "message" varchar(500) NOT NULL,
  "resource_type" varchar(64),
  "resource_id" varchar(255),
  "metadata" jsonb,
  "is_read" boolean DEFAULT false NOT NULL,
  "read_at" timestamp (6) with time zone,
  "created_at" timestamp (6) with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "followup_tasks" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "tenant_id" uuid NOT NULL,
  "lead_id" uuid NOT NULL,
  "funnel_id" uuid,
  "profile_id" varchar(80) DEFAULT 'default' NOT NULL,
  "status" varchar(24) DEFAULT 'pending' NOT NULL,
  "attempt_count" integer DEFAULT 0 NOT NULL,
  "max_followups" integer DEFAULT 3 NOT NULL,
  "interval_hours" integer DEFAULT 24 NOT NULL,
  "due_at" timestamp (6) with time zone NOT NULL,
  "last_notified_at" timestamp (6) with time zone,
  "consulting_agenda_raised_at" timestamp (6) with time zone,
  "completed_at" timestamp (6) with time zone,
  "created_at" timestamp (6) with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp (6) with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "internal_notifications"
 ADD CONSTRAINT "internal_notifications_tenant_id_tenants_id_fk"
 FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id")
 ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "internal_notifications"
 ADD CONSTRAINT "internal_notifications_user_id_users_id_fk"
 FOREIGN KEY ("user_id") REFERENCES "public"."users"("id")
 ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "followup_tasks"
 ADD CONSTRAINT "followup_tasks_tenant_id_tenants_id_fk"
 FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id")
 ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "followup_tasks"
 ADD CONSTRAINT "followup_tasks_lead_id_leads_id_fk"
 FOREIGN KEY ("lead_id") REFERENCES "public"."leads"("id")
 ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "followup_tasks"
 ADD CONSTRAINT "followup_tasks_funnel_id_funnels_id_fk"
 FOREIGN KEY ("funnel_id") REFERENCES "public"."funnels"("id")
 ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "internal_notifications_tenant_created_idx"
ON "internal_notifications" USING btree ("tenant_id","created_at");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "internal_notifications_user_read_idx"
ON "internal_notifications" USING btree ("user_id","is_read","created_at");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "followup_tasks_tenant_status_due_idx"
ON "followup_tasks" USING btree ("tenant_id","status","due_at");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "followup_tasks_lead_status_idx"
ON "followup_tasks" USING btree ("lead_id","status");

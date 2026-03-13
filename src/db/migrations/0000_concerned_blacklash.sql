DO $$ BEGIN
 CREATE TYPE "public"."alert_severity_enum" AS ENUM('info', 'warning', 'critical');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 CREATE TYPE "public"."alert_source_type_enum" AS ENUM('kpi_rule', 'system', 'integration', 'manual');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 CREATE TYPE "public"."alert_status_enum" AS ENUM('active', 'acknowledged', 'resolved');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 CREATE TYPE "public"."audit_action_enum" AS ENUM('login', 'logout', 'tenant_switch', 'create', 'update', 'delete', 'password_change', 'membership_change', 'integration_change');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 CREATE TYPE "public"."classification_type_enum" AS ENUM('sale', 'loss', 'abandonment', 'no_response', 'bad_lead', 'duplicate', 'rescheduled', 'other');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 CREATE TYPE "public"."conversation_status_enum" AS ENUM('open', 'closed', 'archived');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 CREATE TYPE "public"."kpi_rule_type_enum" AS ENUM('threshold_below', 'threshold_above', 'change_percent', 'absence');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 CREATE TYPE "public"."lead_status_enum" AS ENUM('new', 'contacted', 'qualified', 'converted', 'lost', 'duplicate', 'bad_lead');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 CREATE TYPE "public"."provider_enum" AS ENUM('google_ads', 'typebot', 'evolution');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "memberships" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"tenant_id" uuid NOT NULL,
	"role_id" uuid NOT NULL,
	"invited_at" timestamp (6) with time zone NOT NULL,
	"invited_by" uuid,
	"created_at" timestamp (6) with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp (6) with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "memberships_user_tenant_unique" UNIQUE("user_id","tenant_id")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "permissions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"slug" varchar(128) NOT NULL,
	"name" varchar(255) NOT NULL,
	"resource" varchar(64) NOT NULL,
	"action" varchar(64) NOT NULL,
	CONSTRAINT "permissions_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "role_permissions" (
	"role_id" uuid NOT NULL,
	"permission_id" uuid NOT NULL,
	CONSTRAINT "role_permissions_role_id_permission_id_pk" PRIMARY KEY("role_id","permission_id")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "roles" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"slug" varchar(64) NOT NULL,
	"name" varchar(255) NOT NULL,
	"description" text,
	CONSTRAINT "roles_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "sessions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"current_tenant_id" uuid,
	"token_hash" varchar(128) NOT NULL,
	"ip_address" varchar(45),
	"user_agent" varchar(512),
	"expires_at" timestamp (6) with time zone NOT NULL,
	"last_activity_at" timestamp (6) with time zone DEFAULT now() NOT NULL,
	"created_at" timestamp (6) with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "tenants" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(255) NOT NULL,
	"slug" varchar(64) NOT NULL,
	"settings" jsonb,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp (6) with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp (6) with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "tenants_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"email" varchar(255) NOT NULL,
	"password_hash" varchar(255) NOT NULL,
	"name" varchar(255),
	"is_active" boolean DEFAULT true NOT NULL,
	"email_verified_at" timestamp (6) with time zone,
	"last_login_at" timestamp (6) with time zone,
	"created_at" timestamp (6) with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp (6) with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "evolution_instances" (
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
	CONSTRAINT "evolution_instances_tenant_external_unique" UNIQUE("tenant_id","external_id")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "google_ads_accounts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"external_id" varchar(64) NOT NULL,
	"refresh_token_encrypted" text NOT NULL,
	"access_token_encrypted" text,
	"token_expires_at" timestamp (6) with time zone,
	"label" varchar(255),
	"last_synced_at" timestamp (6) with time zone,
	"last_sync_error" varchar(1024),
	"created_at" timestamp (6) with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp (6) with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "google_ads_accounts_tenant_external_unique" UNIQUE("tenant_id","external_id")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "integrations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"provider" "provider_enum" NOT NULL,
	"name" varchar(255) NOT NULL,
	"provider_resource_id" uuid NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"last_synced_at" timestamp (6) with time zone,
	"last_error_at" timestamp (6) with time zone,
	"last_error_message" varchar(1024),
	"created_at" timestamp (6) with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp (6) with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "integrations_tenant_provider_resource_unique" UNIQUE("tenant_id","provider","provider_resource_id")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "typebot_bots" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"external_id" varchar(64) NOT NULL,
	"name" varchar(255),
	"webhook_secret_hash" varchar(128),
	"last_synced_at" timestamp (6) with time zone,
	"created_at" timestamp (6) with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp (6) with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "typebot_bots_tenant_external_unique" UNIQUE("tenant_id","external_id")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "evolution_webhook_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"evolution_instance_id" uuid NOT NULL,
	"external_event_id" varchar(255),
	"event_type" varchar(64) NOT NULL,
	"payload" jsonb NOT NULL,
	"received_at" timestamp (6) with time zone NOT NULL,
	"processed_at" timestamp (6) with time zone,
	"processing_error" varchar(1024)
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "google_ads_sync_logs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"google_ads_account_id" uuid NOT NULL,
	"sync_started_at" timestamp (6) with time zone NOT NULL,
	"sync_finished_at" timestamp (6) with time zone,
	"status" varchar(32) NOT NULL,
	"request_params" jsonb,
	"response_summary" jsonb,
	"error_message" varchar(1024)
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "typebot_webhook_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"typebot_bot_id" uuid NOT NULL,
	"external_event_id" varchar(255),
	"payload" jsonb NOT NULL,
	"received_at" timestamp (6) with time zone NOT NULL,
	"processed_at" timestamp (6) with time zone,
	"processing_error" varchar(1024)
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "funnel_steps" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"funnel_id" uuid NOT NULL,
	"name" varchar(255) NOT NULL,
	"sort_order" integer NOT NULL,
	"criteria" jsonb,
	"created_at" timestamp (6) with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp (6) with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "funnel_steps_funnel_sort_unique" UNIQUE("funnel_id","sort_order")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "funnels" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"name" varchar(255) NOT NULL,
	"description" varchar(1024),
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp (6) with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp (6) with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "lead_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"lead_id" uuid NOT NULL,
	"event_type" varchar(64) NOT NULL,
	"funnel_step_id" uuid,
	"payload" jsonb,
	"occurred_at" timestamp (6) with time zone NOT NULL,
	"source_integration_id" uuid,
	"created_at" timestamp (6) with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "lead_sources" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"name" varchar(255) NOT NULL,
	"source_type" varchar(64),
	"external_id" varchar(255),
	"created_at" timestamp (6) with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp (6) with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "leads" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"status" "lead_status_enum" NOT NULL,
	"source_integration_id" uuid,
	"source_provider" "provider_enum",
	"source_external_id" varchar(255),
	"email" varchar(255),
	"phone" varchar(64),
	"normalized_email" varchar(255),
	"normalized_phone" varchar(64),
	"name" varchar(255),
	"metadata" jsonb,
	"funnel_id" uuid,
	"current_funnel_step_id" uuid,
	"first_seen_at" timestamp (6) with time zone NOT NULL,
	"last_seen_at" timestamp (6) with time zone NOT NULL,
	"created_at" timestamp (6) with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp (6) with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "utm_attributions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"lead_id" uuid NOT NULL,
	"touch_type" varchar(32) NOT NULL,
	"touch_sequence" integer NOT NULL,
	"touched_at" timestamp (6) with time zone NOT NULL,
	"utm_source" varchar(255),
	"utm_medium" varchar(255),
	"utm_campaign" varchar(255),
	"utm_term" varchar(255),
	"utm_content" varchar(255),
	"created_at" timestamp (6) with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "utm_attributions_lead_sequence_unique" UNIQUE("lead_id","touch_sequence")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "conversation_messages" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"conversation_id" uuid NOT NULL,
	"external_id" varchar(255),
	"direction" varchar(8) NOT NULL,
	"content_type" varchar(64) NOT NULL,
	"content_text" text,
	"payload" jsonb,
	"sent_at" timestamp (6) with time zone NOT NULL,
	"created_at" timestamp (6) with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "conversations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"lead_id" uuid,
	"evolution_instance_id" uuid NOT NULL,
	"external_id" varchar(255) NOT NULL,
	"status" "conversation_status_enum" NOT NULL,
	"last_synced_at" timestamp (6) with time zone,
	"started_at" timestamp (6) with time zone NOT NULL,
	"closed_at" timestamp (6) with time zone,
	"created_at" timestamp (6) with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp (6) with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "conversations_tenant_instance_external_unique" UNIQUE("tenant_id","evolution_instance_id","external_id")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "bot_metrics_snapshots" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"typebot_bot_id" uuid NOT NULL,
	"period_start" date NOT NULL,
	"period_end" date NOT NULL,
	"sessions_started" integer DEFAULT 0 NOT NULL,
	"sessions_completed" integer DEFAULT 0 NOT NULL,
	"sessions_abandoned" integer DEFAULT 0 NOT NULL,
	"step_metrics" jsonb,
	"synced_at" timestamp (6) with time zone NOT NULL,
	"created_at" timestamp (6) with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "bot_metrics_snapshots_tenant_bot_period_unique" UNIQUE("tenant_id","typebot_bot_id","period_start")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "campaign_snapshots" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"google_ads_account_id" uuid NOT NULL,
	"external_campaign_id" varchar(64) NOT NULL,
	"campaign_name" varchar(255) NOT NULL,
	"period_start" date NOT NULL,
	"period_end" date NOT NULL,
	"metrics" jsonb NOT NULL,
	"synced_at" timestamp (6) with time zone NOT NULL,
	"created_at" timestamp (6) with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "campaign_snapshots_tenant_account_campaign_period_unique" UNIQUE("tenant_id","google_ads_account_id","external_campaign_id","period_start")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "funnel_step_metrics_snapshot" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"funnel_id" uuid NOT NULL,
	"funnel_step_id" uuid NOT NULL,
	"period_start" date NOT NULL,
	"period_end" date NOT NULL,
	"leads_entered" integer DEFAULT 0 NOT NULL,
	"leads_exited" integer DEFAULT 0 NOT NULL,
	"leads_converted" integer DEFAULT 0 NOT NULL,
	"conversion_rate" numeric(5, 4),
	"synced_at" timestamp (6) with time zone NOT NULL,
	"created_at" timestamp (6) with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "funnel_step_metrics_snapshot_tenant_funnel_step_period_unique" UNIQUE("tenant_id","funnel_id","funnel_step_id","period_start")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "instance_status_logs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"evolution_instance_id" uuid NOT NULL,
	"status" varchar(64) NOT NULL,
	"details" jsonb,
	"recorded_at" timestamp (6) with time zone NOT NULL,
	"created_at" timestamp (6) with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "ai_classifications" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"conversation_id" uuid NOT NULL,
	"lead_id" uuid,
	"classification_type" "classification_type_enum" NOT NULL,
	"confidence_score" numeric(3, 2),
	"summary" text,
	"evidences" jsonb,
	"model_version" varchar(64),
	"version" integer NOT NULL,
	"is_current" boolean DEFAULT true NOT NULL,
	"superseded_at" timestamp (6) with time zone,
	"processed_at" timestamp (6) with time zone NOT NULL,
	"created_at" timestamp (6) with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "alerts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"kpi_rule_id" uuid,
	"source_type" "alert_source_type_enum" NOT NULL,
	"source_id" varchar(255),
	"severity" "alert_severity_enum" NOT NULL,
	"status" "alert_status_enum" NOT NULL,
	"title" varchar(255) NOT NULL,
	"message" text,
	"payload" jsonb,
	"triggered_at" timestamp (6) with time zone NOT NULL,
	"acknowledged_at" timestamp (6) with time zone,
	"acknowledged_by" uuid,
	"resolved_at" timestamp (6) with time zone,
	"created_at" timestamp (6) with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "audit_logs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid,
	"user_id" uuid,
	"action" "audit_action_enum" NOT NULL,
	"resource_type" varchar(64),
	"resource_id" varchar(255),
	"old_values" jsonb,
	"new_values" jsonb,
	"ip_address" varchar(45),
	"user_agent" varchar(512),
	"occurred_at" timestamp (6) with time zone NOT NULL,
	"created_at" timestamp (6) with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "kpi_rules" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"name" varchar(255) NOT NULL,
	"rule_type" "kpi_rule_type_enum" NOT NULL,
	"config" jsonb NOT NULL,
	"integration_id" uuid,
	"funnel_id" uuid,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp (6) with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp (6) with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "processing_failures" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid,
	"job_type" varchar(64) NOT NULL,
	"job_id" varchar(255),
	"resource_type" varchar(64),
	"resource_id" varchar(255),
	"payload_summary" jsonb,
	"error_message" text,
	"error_code" varchar(64),
	"failed_at" timestamp (6) with time zone DEFAULT now() NOT NULL,
	"retry_count" integer DEFAULT 0 NOT NULL,
	"resolved_at" timestamp (6) with time zone,
	"created_at" timestamp (6) with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "memberships" ADD CONSTRAINT "memberships_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "memberships" ADD CONSTRAINT "memberships_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "memberships" ADD CONSTRAINT "memberships_role_id_roles_id_fk" FOREIGN KEY ("role_id") REFERENCES "public"."roles"("id") ON DELETE restrict ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "memberships" ADD CONSTRAINT "memberships_invited_by_users_id_fk" FOREIGN KEY ("invited_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "role_permissions" ADD CONSTRAINT "role_permissions_role_id_roles_id_fk" FOREIGN KEY ("role_id") REFERENCES "public"."roles"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "role_permissions" ADD CONSTRAINT "role_permissions_permission_id_permissions_id_fk" FOREIGN KEY ("permission_id") REFERENCES "public"."permissions"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "sessions" ADD CONSTRAINT "sessions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "sessions" ADD CONSTRAINT "sessions_current_tenant_id_tenants_id_fk" FOREIGN KEY ("current_tenant_id") REFERENCES "public"."tenants"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "evolution_instances" ADD CONSTRAINT "evolution_instances_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "google_ads_accounts" ADD CONSTRAINT "google_ads_accounts_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "integrations" ADD CONSTRAINT "integrations_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "typebot_bots" ADD CONSTRAINT "typebot_bots_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "evolution_webhook_events" ADD CONSTRAINT "evolution_webhook_events_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "evolution_webhook_events" ADD CONSTRAINT "evolution_webhook_events_evolution_instance_id_evolution_instances_id_fk" FOREIGN KEY ("evolution_instance_id") REFERENCES "public"."evolution_instances"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "google_ads_sync_logs" ADD CONSTRAINT "google_ads_sync_logs_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "google_ads_sync_logs" ADD CONSTRAINT "google_ads_sync_logs_google_ads_account_id_google_ads_accounts_id_fk" FOREIGN KEY ("google_ads_account_id") REFERENCES "public"."google_ads_accounts"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "typebot_webhook_events" ADD CONSTRAINT "typebot_webhook_events_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "typebot_webhook_events" ADD CONSTRAINT "typebot_webhook_events_typebot_bot_id_typebot_bots_id_fk" FOREIGN KEY ("typebot_bot_id") REFERENCES "public"."typebot_bots"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "funnel_steps" ADD CONSTRAINT "funnel_steps_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "funnel_steps" ADD CONSTRAINT "funnel_steps_funnel_id_funnels_id_fk" FOREIGN KEY ("funnel_id") REFERENCES "public"."funnels"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "funnels" ADD CONSTRAINT "funnels_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "lead_events" ADD CONSTRAINT "lead_events_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "lead_events" ADD CONSTRAINT "lead_events_lead_id_leads_id_fk" FOREIGN KEY ("lead_id") REFERENCES "public"."leads"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "lead_events" ADD CONSTRAINT "lead_events_funnel_step_id_funnel_steps_id_fk" FOREIGN KEY ("funnel_step_id") REFERENCES "public"."funnel_steps"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "lead_events" ADD CONSTRAINT "lead_events_source_integration_id_integrations_id_fk" FOREIGN KEY ("source_integration_id") REFERENCES "public"."integrations"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "lead_sources" ADD CONSTRAINT "lead_sources_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "leads" ADD CONSTRAINT "leads_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "leads" ADD CONSTRAINT "leads_source_integration_id_integrations_id_fk" FOREIGN KEY ("source_integration_id") REFERENCES "public"."integrations"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "leads" ADD CONSTRAINT "leads_funnel_id_funnels_id_fk" FOREIGN KEY ("funnel_id") REFERENCES "public"."funnels"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "leads" ADD CONSTRAINT "leads_current_funnel_step_id_funnel_steps_id_fk" FOREIGN KEY ("current_funnel_step_id") REFERENCES "public"."funnel_steps"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "utm_attributions" ADD CONSTRAINT "utm_attributions_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "utm_attributions" ADD CONSTRAINT "utm_attributions_lead_id_leads_id_fk" FOREIGN KEY ("lead_id") REFERENCES "public"."leads"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "conversation_messages" ADD CONSTRAINT "conversation_messages_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "conversation_messages" ADD CONSTRAINT "conversation_messages_conversation_id_conversations_id_fk" FOREIGN KEY ("conversation_id") REFERENCES "public"."conversations"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "conversations" ADD CONSTRAINT "conversations_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "conversations" ADD CONSTRAINT "conversations_lead_id_leads_id_fk" FOREIGN KEY ("lead_id") REFERENCES "public"."leads"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "conversations" ADD CONSTRAINT "conversations_evolution_instance_id_evolution_instances_id_fk" FOREIGN KEY ("evolution_instance_id") REFERENCES "public"."evolution_instances"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "bot_metrics_snapshots" ADD CONSTRAINT "bot_metrics_snapshots_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "bot_metrics_snapshots" ADD CONSTRAINT "bot_metrics_snapshots_typebot_bot_id_typebot_bots_id_fk" FOREIGN KEY ("typebot_bot_id") REFERENCES "public"."typebot_bots"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "campaign_snapshots" ADD CONSTRAINT "campaign_snapshots_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "campaign_snapshots" ADD CONSTRAINT "campaign_snapshots_google_ads_account_id_google_ads_accounts_id_fk" FOREIGN KEY ("google_ads_account_id") REFERENCES "public"."google_ads_accounts"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "funnel_step_metrics_snapshot" ADD CONSTRAINT "funnel_step_metrics_snapshot_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "funnel_step_metrics_snapshot" ADD CONSTRAINT "funnel_step_metrics_snapshot_funnel_id_funnels_id_fk" FOREIGN KEY ("funnel_id") REFERENCES "public"."funnels"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "funnel_step_metrics_snapshot" ADD CONSTRAINT "funnel_step_metrics_snapshot_funnel_step_id_funnel_steps_id_fk" FOREIGN KEY ("funnel_step_id") REFERENCES "public"."funnel_steps"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "instance_status_logs" ADD CONSTRAINT "instance_status_logs_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "instance_status_logs" ADD CONSTRAINT "instance_status_logs_evolution_instance_id_evolution_instances_id_fk" FOREIGN KEY ("evolution_instance_id") REFERENCES "public"."evolution_instances"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "ai_classifications" ADD CONSTRAINT "ai_classifications_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "ai_classifications" ADD CONSTRAINT "ai_classifications_conversation_id_conversations_id_fk" FOREIGN KEY ("conversation_id") REFERENCES "public"."conversations"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "ai_classifications" ADD CONSTRAINT "ai_classifications_lead_id_leads_id_fk" FOREIGN KEY ("lead_id") REFERENCES "public"."leads"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "alerts" ADD CONSTRAINT "alerts_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "alerts" ADD CONSTRAINT "alerts_kpi_rule_id_kpi_rules_id_fk" FOREIGN KEY ("kpi_rule_id") REFERENCES "public"."kpi_rules"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "alerts" ADD CONSTRAINT "alerts_acknowledged_by_users_id_fk" FOREIGN KEY ("acknowledged_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "kpi_rules" ADD CONSTRAINT "kpi_rules_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "kpi_rules" ADD CONSTRAINT "kpi_rules_integration_id_integrations_id_fk" FOREIGN KEY ("integration_id") REFERENCES "public"."integrations"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "kpi_rules" ADD CONSTRAINT "kpi_rules_funnel_id_funnels_id_fk" FOREIGN KEY ("funnel_id") REFERENCES "public"."funnels"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "processing_failures" ADD CONSTRAINT "processing_failures_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "sessions_token_hash_idx" ON "sessions" USING btree ("token_hash");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "sessions_user_id_idx" ON "sessions" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "sessions_expires_at_idx" ON "sessions" USING btree ("expires_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "evolution_instances_tenant_external_idx" ON "evolution_instances" USING btree ("tenant_id","external_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "google_ads_accounts_tenant_external_idx" ON "google_ads_accounts" USING btree ("tenant_id","external_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "integrations_tenant_provider_idx" ON "integrations" USING btree ("tenant_id","provider");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "integrations_tenant_active_idx" ON "integrations" USING btree ("tenant_id","is_active");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "typebot_bots_tenant_external_idx" ON "typebot_bots" USING btree ("tenant_id","external_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "evolution_webhook_events_tenant_received_idx" ON "evolution_webhook_events" USING btree ("tenant_id","received_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "evolution_webhook_events_instance_received_idx" ON "evolution_webhook_events" USING btree ("evolution_instance_id","received_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "evolution_webhook_events_processed_idx" ON "evolution_webhook_events" USING btree ("processed_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "google_ads_sync_logs_tenant_started_idx" ON "google_ads_sync_logs" USING btree ("tenant_id","sync_started_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "google_ads_sync_logs_account_started_idx" ON "google_ads_sync_logs" USING btree ("google_ads_account_id","sync_started_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "typebot_webhook_events_tenant_received_idx" ON "typebot_webhook_events" USING btree ("tenant_id","received_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "typebot_webhook_events_bot_received_idx" ON "typebot_webhook_events" USING btree ("typebot_bot_id","received_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "typebot_webhook_events_processed_idx" ON "typebot_webhook_events" USING btree ("processed_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "funnel_steps_funnel_idx" ON "funnel_steps" USING btree ("funnel_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "funnel_steps_tenant_idx" ON "funnel_steps" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "lead_events_lead_occurred_idx" ON "lead_events" USING btree ("lead_id","occurred_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "lead_events_tenant_occurred_idx" ON "lead_events" USING btree ("tenant_id","occurred_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "lead_events_lead_type_idx" ON "lead_events" USING btree ("lead_id","event_type");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "lead_sources_tenant_idx" ON "lead_sources" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "leads_tenant_status_idx" ON "leads" USING btree ("tenant_id","status");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "leads_tenant_first_seen_idx" ON "leads" USING btree ("tenant_id","first_seen_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "leads_funnel_step_idx" ON "leads" USING btree ("funnel_id","current_funnel_step_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "leads_email_idx" ON "leads" USING btree ("email");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "leads_phone_idx" ON "leads" USING btree ("phone");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "leads_tenant_normalized_email_unique" ON "leads" USING btree ("tenant_id","normalized_email") WHERE "leads"."normalized_email" IS NOT NULL;--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "leads_tenant_normalized_phone_unique" ON "leads" USING btree ("tenant_id","normalized_phone") WHERE "leads"."normalized_phone" IS NOT NULL;--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "leads_tenant_source_external_unique" ON "leads" USING btree ("tenant_id","source_provider","source_external_id") WHERE "leads"."source_external_id" IS NOT NULL;--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "utm_attributions_lead_touched_idx" ON "utm_attributions" USING btree ("lead_id","touched_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "utm_attributions_tenant_touched_idx" ON "utm_attributions" USING btree ("tenant_id","touched_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "conversation_messages_conversation_sent_idx" ON "conversation_messages" USING btree ("conversation_id","sent_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "conversation_messages_tenant_sent_idx" ON "conversation_messages" USING btree ("tenant_id","sent_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "conversations_tenant_lead_idx" ON "conversations" USING btree ("tenant_id","lead_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "conversations_tenant_status_idx" ON "conversations" USING btree ("tenant_id","status");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "conversations_tenant_started_idx" ON "conversations" USING btree ("tenant_id","started_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "bot_metrics_snapshots_tenant_period_idx" ON "bot_metrics_snapshots" USING btree ("tenant_id","period_start");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "bot_metrics_snapshots_bot_period_idx" ON "bot_metrics_snapshots" USING btree ("typebot_bot_id","period_start");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "campaign_snapshots_tenant_period_idx" ON "campaign_snapshots" USING btree ("tenant_id","period_start","period_end");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "campaign_snapshots_account_period_idx" ON "campaign_snapshots" USING btree ("google_ads_account_id","period_start");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "funnel_step_metrics_snapshot_tenant_funnel_period_idx" ON "funnel_step_metrics_snapshot" USING btree ("tenant_id","funnel_id","period_start");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "funnel_step_metrics_snapshot_funnel_period_idx" ON "funnel_step_metrics_snapshot" USING btree ("funnel_id","period_start");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "instance_status_logs_instance_recorded_idx" ON "instance_status_logs" USING btree ("evolution_instance_id","recorded_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "instance_status_logs_tenant_recorded_idx" ON "instance_status_logs" USING btree ("tenant_id","recorded_at");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "ai_classifications_conversation_version_unique" ON "ai_classifications" USING btree ("conversation_id","version");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "ai_classifications_conversation_current_unique" ON "ai_classifications" USING btree ("conversation_id") WHERE "ai_classifications"."is_current" = true;--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "ai_classifications_tenant_type_idx" ON "ai_classifications" USING btree ("tenant_id","classification_type");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "ai_classifications_tenant_processed_idx" ON "ai_classifications" USING btree ("tenant_id","processed_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "alerts_tenant_triggered_idx" ON "alerts" USING btree ("tenant_id","triggered_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "alerts_tenant_status_idx" ON "alerts" USING btree ("tenant_id","status");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "alerts_kpi_rule_idx" ON "alerts" USING btree ("kpi_rule_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "audit_logs_tenant_occurred_idx" ON "audit_logs" USING btree ("tenant_id","occurred_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "audit_logs_user_occurred_idx" ON "audit_logs" USING btree ("user_id","occurred_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "audit_logs_resource_idx" ON "audit_logs" USING btree ("resource_type","resource_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "audit_logs_action_occurred_idx" ON "audit_logs" USING btree ("action","occurred_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "kpi_rules_tenant_idx" ON "kpi_rules" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "kpi_rules_tenant_active_idx" ON "kpi_rules" USING btree ("tenant_id","is_active");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "processing_failures_tenant_failed_idx" ON "processing_failures" USING btree ("tenant_id","failed_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "processing_failures_job_type_failed_idx" ON "processing_failures" USING btree ("job_type","failed_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "processing_failures_unresolved_idx" ON "processing_failures" USING btree ("resolved_at") WHERE "processing_failures"."resolved_at" IS NULL;
DO $$
BEGIN
  CREATE EXTENSION IF NOT EXISTS vector;
EXCEPTION
  WHEN OTHERS THEN
    RAISE NOTICE 'Extensao vector indisponivel neste ambiente; objetos de embeddings serao ignorados.';
END $$;
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "knowledge_documents" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "tenant_id" uuid,
  "scope" varchar(16) NOT NULL,
  "title" varchar(255) NOT NULL,
  "source_type" varchar(64) NOT NULL,
  "source_uri" varchar(1024),
  "content" text NOT NULL,
  "metadata" jsonb,
  "version" integer DEFAULT 1 NOT NULL,
  "is_active" boolean DEFAULT true NOT NULL,
  "created_by" uuid,
  "created_at" timestamp (6) with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "knowledge_chunks" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "document_id" uuid NOT NULL,
  "tenant_id" uuid,
  "scope" varchar(16) NOT NULL,
  "chunk_index" integer NOT NULL,
  "content" text NOT NULL,
  "token_count" integer DEFAULT 0 NOT NULL,
  "metadata" jsonb,
  "created_at" timestamp (6) with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'vector') THEN
    EXECUTE '
      CREATE TABLE IF NOT EXISTS "knowledge_embeddings" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
        "chunk_id" uuid NOT NULL,
        "tenant_id" uuid,
        "scope" varchar(16) NOT NULL,
        "embedding" vector(1536) NOT NULL,
        "model" varchar(80) NOT NULL,
        "created_at" timestamp (6) with time zone DEFAULT now() NOT NULL
      )
    ';
  ELSE
    RAISE NOTICE 'Tabela knowledge_embeddings ignorada (vector indisponivel).';
  END IF;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "knowledge_documents"
 ADD CONSTRAINT "knowledge_documents_tenant_id_tenants_id_fk"
 FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id")
 ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "knowledge_chunks"
 ADD CONSTRAINT "knowledge_chunks_document_id_knowledge_documents_id_fk"
 FOREIGN KEY ("document_id") REFERENCES "public"."knowledge_documents"("id")
 ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "knowledge_chunks"
 ADD CONSTRAINT "knowledge_chunks_tenant_id_tenants_id_fk"
 FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id")
 ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 IF EXISTS (
   SELECT 1
   FROM information_schema.tables
   WHERE table_schema = 'public' AND table_name = 'knowledge_embeddings'
 ) THEN
   ALTER TABLE "knowledge_embeddings"
   ADD CONSTRAINT "knowledge_embeddings_chunk_id_knowledge_chunks_id_fk"
   FOREIGN KEY ("chunk_id") REFERENCES "public"."knowledge_chunks"("id")
   ON DELETE cascade ON UPDATE no action;
 END IF;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 IF EXISTS (
   SELECT 1
   FROM information_schema.tables
   WHERE table_schema = 'public' AND table_name = 'knowledge_embeddings'
 ) THEN
   ALTER TABLE "knowledge_embeddings"
   ADD CONSTRAINT "knowledge_embeddings_tenant_id_tenants_id_fk"
   FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id")
   ON DELETE cascade ON UPDATE no action;
 END IF;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "knowledge_documents_scope_tenant_idx"
ON "knowledge_documents" USING btree ("scope","tenant_id","created_at");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "knowledge_chunks_scope_tenant_idx"
ON "knowledge_chunks" USING btree ("scope","tenant_id","document_id","chunk_index");
--> statement-breakpoint
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'knowledge_embeddings'
  ) THEN
    CREATE UNIQUE INDEX IF NOT EXISTS "knowledge_embeddings_chunk_unique"
    ON "knowledge_embeddings" USING btree ("chunk_id");
  END IF;
END $$;
--> statement-breakpoint
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'knowledge_embeddings'
  ) THEN
    CREATE INDEX IF NOT EXISTS "knowledge_embeddings_scope_tenant_idx"
    ON "knowledge_embeddings" USING btree ("scope","tenant_id","created_at");
  END IF;
END $$;
--> statement-breakpoint
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'knowledge_embeddings'
  ) THEN
    CREATE INDEX IF NOT EXISTS "knowledge_embeddings_vector_idx"
    ON "knowledge_embeddings" USING ivfflat ("embedding" vector_cosine_ops) WITH (lists = 100);
  END IF;
END $$;


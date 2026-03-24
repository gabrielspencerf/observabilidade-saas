-- RLS tenant-scoped rollout com flags de sessão:
-- app.enforce_rls: on|off
-- app.bypass_rls: on|off
-- app.current_tenant_id: uuid (string)
--
-- Observação:
-- - Por padrão (enforce_rls != 'on'), políticas liberam acesso para evitar quebra imediata.
-- - Quando enforce_rls='on', acesso fica restrito por tenant_id (ou bypass explícito).

DO $$
DECLARE
  rec record;
BEGIN
  FOR rec IN
    SELECT c.table_schema, c.table_name
    FROM information_schema.columns c
    WHERE c.table_schema = 'public'
      AND c.column_name = 'tenant_id'
      AND c.table_name NOT IN ('memberships')
  LOOP
    EXECUTE format('ALTER TABLE %I.%I ENABLE ROW LEVEL SECURITY', rec.table_schema, rec.table_name);
    EXECUTE format('ALTER TABLE %I.%I FORCE ROW LEVEL SECURITY', rec.table_schema, rec.table_name);

    EXECUTE format('DROP POLICY IF EXISTS tenant_rls_policy ON %I.%I', rec.table_schema, rec.table_name);

    EXECUTE format(
      'CREATE POLICY tenant_rls_policy ON %I.%I
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
      rec.table_schema,
      rec.table_name
    );
  END LOOP;
END $$;

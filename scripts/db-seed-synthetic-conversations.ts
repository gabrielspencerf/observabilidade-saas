import "dotenv/config";
import postgres from "postgres";

type RowWithId = { id: string };

async function ensureEvolutionInstance(
  sql: postgres.Sql,
  tenantId: string
): Promise<string> {
  const externalId = "synthetic-evolution-local";
  const existing = await sql<RowWithId[]>`
    select id
    from evolution_instances
    where tenant_id = ${tenantId}
      and external_id = ${externalId}
    limit 1
  `;
  if (existing[0]) return existing[0].id;

  const inserted = await sql<RowWithId[]>`
    insert into evolution_instances (tenant_id, external_id, base_url, instance_name)
    values (${tenantId}, ${externalId}, 'http://localhost:8081', 'Synthetic Evolution Local')
    returning id
  `;
  return inserted[0].id;
}

async function ensureUazapiInstance(
  sql: postgres.Sql,
  tenantId: string
): Promise<string> {
  const externalId = "synthetic-uazapi-local";
  const existing = await sql<RowWithId[]>`
    select id
    from uazapi_instances
    where tenant_id = ${tenantId}
      and external_id = ${externalId}
    limit 1
  `;
  if (existing[0]) return existing[0].id;

  const inserted = await sql<RowWithId[]>`
    insert into uazapi_instances (tenant_id, external_id, base_url, instance_name)
    values (${tenantId}, ${externalId}, 'http://localhost:8082', 'Synthetic UAZAPI Local')
    returning id
  `;
  return inserted[0].id;
}

async function ensureChatwootAccount(
  sql: postgres.Sql,
  tenantId: string
): Promise<string> {
  const externalId = "synthetic-chatwoot-local";
  const existing = await sql<RowWithId[]>`
    select id
    from chatwoot_accounts
    where tenant_id = ${tenantId}
      and external_id = ${externalId}
    limit 1
  `;
  if (existing[0]) return existing[0].id;

  const inserted = await sql<RowWithId[]>`
    insert into chatwoot_accounts (tenant_id, external_id, base_url, label)
    values (
      ${tenantId},
      ${externalId},
      'https://app.chatwoot.com',
      'Synthetic Chatwoot Local'
    )
    returning id
  `;
  return inserted[0].id;
}

async function ensureWhatsappCloudNumber(
  sql: postgres.Sql,
  tenantId: string
): Promise<string> {
  const phoneNumberId = "synthetic-wa-phone-local";
  const existing = await sql<RowWithId[]>`
    select id
    from whatsapp_cloud_numbers
    where tenant_id = ${tenantId}
      and phone_number_id = ${phoneNumberId}
    limit 1
  `;
  if (existing[0]) return existing[0].id;

  const inserted = await sql<RowWithId[]>`
    insert into whatsapp_cloud_numbers (
      tenant_id,
      phone_number_id,
      waba_id,
      display_phone,
      webhook_verify_token,
      label
    )
    values (
      ${tenantId},
      ${phoneNumberId},
      'synthetic-waba-local',
      '+15550000001',
      'synthetic-wc-verify-token',
      'Synthetic WhatsApp Cloud Local'
    )
    returning id
  `;
  return inserted[0].id;
}

async function ensureConversation(
  sql: postgres.Sql,
  args: {
    tenantId: string;
    evolutionInstanceId: string | null;
    uazapiInstanceId: string | null;
    chatwootAccountId: string | null;
    whatsappCloudNumberId: string | null;
    externalId: string;
  }
): Promise<string> {
  const {
    tenantId,
    evolutionInstanceId,
    uazapiInstanceId,
    chatwootAccountId,
    whatsappCloudNumberId,
    externalId,
  } = args;
  const existing = await sql<RowWithId[]>`
    select id
    from conversations
    where tenant_id = ${tenantId}
      and external_id = ${externalId}
      and evolution_instance_id is not distinct from ${evolutionInstanceId}
      and uazapi_instance_id is not distinct from ${uazapiInstanceId}
      and chatwoot_account_id is not distinct from ${chatwootAccountId}
      and whatsapp_cloud_number_id is not distinct from ${whatsappCloudNumberId}
    limit 1
  `;
  if (existing[0]) return existing[0].id;

  const inserted = await sql<RowWithId[]>`
    insert into conversations (
      tenant_id,
      evolution_instance_id,
      uazapi_instance_id,
      chatwoot_account_id,
      whatsapp_cloud_number_id,
      external_id,
      status,
      started_at
    )
    values (
      ${tenantId},
      ${evolutionInstanceId},
      ${uazapiInstanceId},
      ${chatwootAccountId},
      ${whatsappCloudNumberId},
      ${externalId},
      'open',
      now()
    )
    returning id
  `;
  return inserted[0].id;
}

async function ensureMessage(
  sql: postgres.Sql,
  args: {
    tenantId: string;
    conversationId: string;
    externalId: string;
    direction: "in" | "out";
    contentText: string;
  }
): Promise<void> {
  const { tenantId, conversationId, externalId, direction, contentText } = args;
  const existing = await sql<RowWithId[]>`
    select id
    from conversation_messages
    where conversation_id = ${conversationId}
      and external_id = ${externalId}
    limit 1
  `;
  if (existing[0]) return;

  await sql`
    insert into conversation_messages (
      tenant_id,
      conversation_id,
      external_id,
      direction,
      content_type,
      content_text,
      sent_at
    )
    values (
      ${tenantId},
      ${conversationId},
      ${externalId},
      ${direction},
      'text',
      ${contentText},
      now()
    )
  `;
}

async function main(): Promise<void> {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    throw new Error("DATABASE_URL nao definida.");
  }

  const sql = postgres(databaseUrl, { max: 1 });
  try {
    const preferredSlug = process.env.SEED_TENANT_SLUG ?? "tenant-teste";
    const tenantBySlug = await sql<{ id: string; slug: string }[]>`
      select id, slug
      from tenants
      where slug = ${preferredSlug}
      limit 1
    `;
    const firstTenant = await sql<{ id: string; slug: string }[]>`
      select id, slug
      from tenants
      order by created_at asc
      limit 1
    `;

    const tenant = tenantBySlug[0] ?? firstTenant[0];
    if (!tenant) {
      throw new Error("Nenhum tenant encontrado. Rode npm run db:seed antes.");
    }

    const evolutionInstanceId = await ensureEvolutionInstance(sql, tenant.id);
    const uazapiInstanceId = await ensureUazapiInstance(sql, tenant.id);
    const chatwootAccountId = await ensureChatwootAccount(sql, tenant.id);
    const whatsappCloudNumberId = await ensureWhatsappCloudNumber(sql, tenant.id);

    const evolutionConversationId = await ensureConversation(sql, {
      tenantId: tenant.id,
      evolutionInstanceId,
      uazapiInstanceId: null,
      chatwootAccountId: null,
      whatsappCloudNumberId: null,
      externalId: "synthetic-evo-conv-001",
    });

    const uazapiConversationId = await ensureConversation(sql, {
      tenantId: tenant.id,
      evolutionInstanceId: null,
      uazapiInstanceId,
      chatwootAccountId: null,
      whatsappCloudNumberId: null,
      externalId: "synthetic-uaz-conv-001",
    });

    const chatwootConversationId = await ensureConversation(sql, {
      tenantId: tenant.id,
      evolutionInstanceId: null,
      uazapiInstanceId: null,
      chatwootAccountId,
      whatsappCloudNumberId: null,
      externalId: "synthetic-cw-conv-001",
    });

    const wcConversationId = await ensureConversation(sql, {
      tenantId: tenant.id,
      evolutionInstanceId: null,
      uazapiInstanceId: null,
      chatwootAccountId: null,
      whatsappCloudNumberId,
      externalId: "5511999887766",
    });

    await ensureMessage(sql, {
      tenantId: tenant.id,
      conversationId: evolutionConversationId,
      externalId: "synthetic-evo-msg-001",
      direction: "in",
      contentText: "Mensagem sintetica inbound Evolution",
    });
    await ensureMessage(sql, {
      tenantId: tenant.id,
      conversationId: evolutionConversationId,
      externalId: "synthetic-evo-msg-002",
      direction: "out",
      contentText: "Mensagem sintetica outbound Evolution",
    });
    await ensureMessage(sql, {
      tenantId: tenant.id,
      conversationId: uazapiConversationId,
      externalId: "synthetic-uaz-msg-001",
      direction: "in",
      contentText: "Mensagem sintetica inbound UAZAPI",
    });
    await ensureMessage(sql, {
      tenantId: tenant.id,
      conversationId: uazapiConversationId,
      externalId: "synthetic-uaz-msg-002",
      direction: "out",
      contentText: "Mensagem sintetica outbound UAZAPI",
    });
    await ensureMessage(sql, {
      tenantId: tenant.id,
      conversationId: chatwootConversationId,
      externalId: "synthetic-cw-msg-001",
      direction: "in",
      contentText: "Mensagem sintetica inbound Chatwoot",
    });
    await ensureMessage(sql, {
      tenantId: tenant.id,
      conversationId: wcConversationId,
      externalId: "synthetic-wc-msg-001",
      direction: "in",
      contentText: "Mensagem sintetica inbound WhatsApp Cloud",
    });

    const [summary] = await sql<{
      chatwootAccounts: number;
      whatsappCloudNumbers: number;
      conversations: number;
      messages: number;
    }[]>`
      select
        (
          select count(*)::int
          from chatwoot_accounts
          where tenant_id = ${tenant.id}
            and external_id = 'synthetic-chatwoot-local'
        ) as chatwoot_accounts,
        (
          select count(*)::int
          from whatsapp_cloud_numbers
          where tenant_id = ${tenant.id}
            and phone_number_id = 'synthetic-wa-phone-local'
        ) as whatsapp_cloud_numbers,
        (
          select count(*)::int
          from conversations
          where external_id in (
            'synthetic-evo-conv-001',
            'synthetic-uaz-conv-001',
            'synthetic-cw-conv-001',
            '5511999887766'
          )
        ) as conversations,
        (
          select count(*)::int
          from conversation_messages
          where external_id in (
            'synthetic-evo-msg-001',
            'synthetic-evo-msg-002',
            'synthetic-uaz-msg-001',
            'synthetic-uaz-msg-002',
            'synthetic-cw-msg-001',
            'synthetic-wc-msg-001'
          )
        ) as messages
    `;

    console.log(
      JSON.stringify(
        {
          tenant: tenant.slug,
          syntheticChatwootAccounts: summary?.chatwootAccounts ?? 0,
          syntheticWhatsappCloudNumbers: summary?.whatsappCloudNumbers ?? 0,
          syntheticConversations: summary?.conversations ?? 0,
          syntheticMessages: summary?.messages ?? 0,
        },
        null,
        2
      )
    );
  } finally {
    await sql.end({ timeout: 5 });
  }
}

main().catch((err) => {
  console.error("Erro no seed sintetico de conversas:", err);
  process.exit(1);
});

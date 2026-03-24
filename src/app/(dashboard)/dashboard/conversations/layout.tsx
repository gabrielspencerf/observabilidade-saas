import { getDashboardTenantContext } from "@/server/dashboard";
import { listConversationsForTenant } from "@/server/dashboard";
import { ConversationsLayoutClient } from "./conversations-layout-client";

const CONVERSATIONS_LIMIT = 200;

export default async function ConversationsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { tenantId } = await getDashboardTenantContext();
  const rows = await listConversationsForTenant(tenantId, {
    limit: CONVERSATIONS_LIMIT,
  });

  /** Datas como ISO string — objetos Date quebram a serialização RSC → Client Component. */
  const conversations = rows.map((c) => ({
    id: c.id,
    externalId: c.externalId,
    status: c.status,
    startedAt: c.startedAt.toISOString(),
    lastSyncedAt: c.lastSyncedAt ? c.lastSyncedAt.toISOString() : null,
    instanceDisplay: c.instanceDisplay,
    messageCount: c.messageCount,
    leadName: c.leadName,
    leadPhone: c.leadPhone,
  }));

  return (
    <ConversationsLayoutClient
      conversations={conversations}
      className="flex h-[min(100dvh-6.5rem,56rem)] min-h-[28rem] min-w-0 flex-col overflow-hidden rounded-2xl border border-brand-border bg-brand-surface md:flex-row md:min-h-[min(100dvh-7.5rem,56rem)]"
    >
      {children}
    </ConversationsLayoutClient>
  );
}

import { auditLogs } from "@/db/schema";
import { getDb } from "@/server/db";

type AuditAction =
  | "login"
  | "logout"
  | "tenant_switch"
  | "create"
  | "update"
  | "delete"
  | "password_change"
  | "membership_change"
  | "integration_change";

export async function writeAuditLog(input: {
  tenantId?: string | null;
  userId?: string | null;
  action: AuditAction;
  resourceType?: string | null;
  resourceId?: string | null;
  oldValues?: Record<string, unknown> | null;
  newValues?: Record<string, unknown> | null;
  ipAddress?: string | null;
  userAgent?: string | null;
}): Promise<void> {
  const db = getDb();
  await db.insert(auditLogs).values({
    tenantId: input.tenantId ?? null,
    userId: input.userId ?? null,
    action: input.action,
    resourceType: input.resourceType ?? null,
    resourceId: input.resourceId ?? null,
    oldValues: input.oldValues ?? null,
    newValues: input.newValues ?? null,
    ipAddress: input.ipAddress ?? null,
    userAgent: input.userAgent ?? null,
    occurredAt: new Date(),
  });
}

import { and, desc, eq, inArray, isNull, or } from "drizzle-orm";
import { internalNotifications, memberships } from "@/db/schema";
import { getDb } from "@/server/db";

export interface InternalNotificationRow {
  id: string;
  type: string;
  title: string;
  message: string;
  resourceType: string | null;
  resourceId: string | null;
  isRead: boolean;
  createdAt: Date;
  metadata: Record<string, unknown> | null;
}

interface CreateInternalNotificationInput {
  tenantId: string;
  userId?: string | null;
  type: string;
  title: string;
  message: string;
  resourceType?: string | null;
  resourceId?: string | null;
  metadata?: Record<string, unknown> | null;
}

export async function createInternalNotification(
  input: CreateInternalNotificationInput
): Promise<void> {
  const db = getDb();
  await db.insert(internalNotifications).values({
    tenantId: input.tenantId,
    userId: input.userId ?? null,
    type: input.type,
    title: input.title,
    message: input.message,
    resourceType: input.resourceType ?? null,
    resourceId: input.resourceId ?? null,
    metadata: input.metadata ?? null,
  });
}

export async function notifyTenantUsers(
  tenantId: string,
  payload: Omit<CreateInternalNotificationInput, "tenantId" | "userId">
): Promise<void> {
  const db = getDb();
  const users = await db
    .select({ userId: memberships.userId })
    .from(memberships)
    .where(eq(memberships.tenantId, tenantId));

  if (users.length === 0) {
    await createInternalNotification({
      tenantId,
      userId: null,
      ...payload,
    });
    return;
  }

  await db.insert(internalNotifications).values(
    users.map((user) => ({
      tenantId,
      userId: user.userId,
      type: payload.type,
      title: payload.title,
      message: payload.message,
      resourceType: payload.resourceType ?? null,
      resourceId: payload.resourceId ?? null,
      metadata: payload.metadata ?? null,
    }))
  );
}

export async function listInternalNotificationsForUser(input: {
  tenantId: string;
  userId: string;
  limit?: number;
}): Promise<InternalNotificationRow[]> {
  const db = getDb();
  const rows = await db
    .select({
      id: internalNotifications.id,
      type: internalNotifications.type,
      title: internalNotifications.title,
      message: internalNotifications.message,
      resourceType: internalNotifications.resourceType,
      resourceId: internalNotifications.resourceId,
      isRead: internalNotifications.isRead,
      createdAt: internalNotifications.createdAt,
      metadata: internalNotifications.metadata,
    })
    .from(internalNotifications)
    .where(
      and(
        eq(internalNotifications.tenantId, input.tenantId),
        or(eq(internalNotifications.userId, input.userId), isNull(internalNotifications.userId))
      )
    )
    .orderBy(desc(internalNotifications.createdAt))
    .limit(input.limit ?? 50);

  return rows.map((row) => ({
    id: row.id,
    type: row.type,
    title: row.title,
    message: row.message,
    resourceType: row.resourceType ?? null,
    resourceId: row.resourceId ?? null,
    isRead: row.isRead,
    createdAt: row.createdAt,
    metadata: (row.metadata as Record<string, unknown> | null) ?? null,
  }));
}

export async function markInternalNotificationsAsRead(input: {
  tenantId: string;
  userId: string;
  ids: string[];
}): Promise<void> {
  if (input.ids.length === 0) return;
  const db = getDb();
  await db
    .update(internalNotifications)
    .set({
      isRead: true,
      readAt: new Date(),
    })
    .where(
      and(
        eq(internalNotifications.tenantId, input.tenantId),
        eq(internalNotifications.userId, input.userId),
        inArray(internalNotifications.id, input.ids)
      )
    );
}

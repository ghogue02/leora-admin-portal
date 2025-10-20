import type { Prisma, PrismaClient } from "@prisma/client";

export type AuditAction = "CREATE" | "UPDATE" | "DELETE" | "STATUS_CHANGE" | "CANCEL";

export type AuditLogEntry = {
  tenantId: string;
  userId?: string;
  entityType: string;
  entityId: string;
  action: AuditAction;
  changes?: Record<string, any>;
  metadata?: Record<string, any>;
};

/**
 * Create an audit log entry
 */
export async function createAuditLog(
  db: PrismaClient | Prisma.TransactionClient,
  entry: AuditLogEntry,
): Promise<void> {
  await db.auditLog.create({
    data: {
      tenantId: entry.tenantId,
      userId: entry.userId,
      entityType: entry.entityType,
      entityId: entry.entityId,
      action: entry.action,
      changes: entry.changes || null,
      metadata: entry.metadata || null,
    },
  });
}

/**
 * Get audit logs for a specific entity
 */
export async function getAuditLogs(
  db: PrismaClient | Prisma.TransactionClient,
  tenantId: string,
  entityType: string,
  entityId: string,
): Promise<any[]> {
  const logs = await db.auditLog.findMany({
    where: {
      tenantId,
      entityType,
      entityId,
    },
    include: {
      user: {
        select: {
          id: true,
          fullName: true,
          email: true,
        },
      },
    },
    orderBy: {
      createdAt: "desc",
    },
  });

  return logs.map((log) => ({
    id: log.id,
    action: log.action,
    changes: log.changes,
    metadata: log.metadata,
    createdAt: log.createdAt,
    user: log.user,
  }));
}

/**
 * Helper to calculate changes between old and new values
 */
export function calculateChanges(
  oldValue: Record<string, any>,
  newValue: Record<string, any>,
): Record<string, any> {
  const changes: Record<string, any> = {};

  // Check for changed or new fields
  for (const key in newValue) {
    if (oldValue[key] !== newValue[key]) {
      changes[key] = {
        from: oldValue[key],
        to: newValue[key],
      };
    }
  }

  // Check for removed fields
  for (const key in oldValue) {
    if (!(key in newValue) && oldValue[key] !== undefined) {
      changes[key] = {
        from: oldValue[key],
        to: undefined,
      };
    }
  }

  return changes;
}

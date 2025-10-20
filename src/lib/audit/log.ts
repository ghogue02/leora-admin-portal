import { PrismaClient, Prisma } from "@prisma/client";

export type AuditAction = "CREATE" | "UPDATE" | "DELETE" | "STATUS_CHANGE" | "TERRITORY_CHANGE";

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
  entry: AuditLogEntry
) {
  try {
    await db.auditLog.create({
      data: {
        tenantId: entry.tenantId,
        userId: entry.userId || null,
        entityType: entry.entityType,
        entityId: entry.entityId,
        action: entry.action,
        changes: entry.changes || null,
        metadata: entry.metadata || null,
      },
    });
  } catch (error) {
    // Log the error but don't throw - audit logging shouldn't break the main operation
    console.error("Failed to create audit log:", error);
  }
}

/**
 * Helper to log sales rep updates
 */
export async function logSalesRepUpdate(
  db: PrismaClient | Prisma.TransactionClient,
  {
    tenantId,
    userId,
    salesRepId,
    changes,
    metadata,
  }: {
    tenantId: string;
    userId: string;
    salesRepId: string;
    changes: Record<string, any>;
    metadata?: Record<string, any>;
  }
) {
  await createAuditLog(db, {
    tenantId,
    userId,
    entityType: "SalesRep",
    entityId: salesRepId,
    action: "UPDATE",
    changes,
    metadata,
  });
}

/**
 * Helper to log territory changes
 */
export async function logTerritoryChange(
  db: PrismaClient | Prisma.TransactionClient,
  {
    tenantId,
    userId,
    salesRepId,
    oldTerritory,
    newTerritory,
    customersReassigned,
    metadata,
  }: {
    tenantId: string;
    userId: string;
    salesRepId: string;
    oldTerritory: string;
    newTerritory: string;
    customersReassigned: boolean;
    metadata?: Record<string, any>;
  }
) {
  await createAuditLog(db, {
    tenantId,
    userId,
    entityType: "SalesRep",
    entityId: salesRepId,
    action: "TERRITORY_CHANGE",
    changes: {
      oldTerritory,
      newTerritory,
      customersReassigned,
    },
    metadata,
  });
}

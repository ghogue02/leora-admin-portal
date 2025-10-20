import type { Prisma, PrismaClient } from "@prisma/client";
import { NextRequest } from "next/server";

export interface AuditLogEntry {
  tenantId: string;
  userId?: string;
  action: string;
  entityType: string;
  entityId: string;
  changes?: Record<string, { old: any; new: any }>;
  metadata?: Record<string, any>;
  reason?: string;
}

/**
 * Operation types for audit logging
 */
export enum AuditOperation {
  CREATE = "CREATE",
  UPDATE = "UPDATE",
  DELETE = "DELETE",
  STATUS_CHANGE = "STATUS_CHANGE",
  REASSIGN = "REASSIGN",
}

/**
 * Extract IP address from Next.js request
 */
function getIpAddress(request?: NextRequest): string | null {
  if (!request) return null;

  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) {
    return forwarded.split(",")[0].trim();
  }

  const realIp = request.headers.get("x-real-ip");
  if (realIp) {
    return realIp;
  }

  return null;
}

/**
 * Log a change to the audit trail with database persistence
 */
export async function logChange(
  entry: AuditLogEntry,
  db?: PrismaClient | Prisma.TransactionClient,
  request?: NextRequest,
): Promise<void> {
  try {
    const ipAddress = request ? getIpAddress(request) : null;

    const auditMetadata = {
      ...entry.metadata,
      ...(entry.reason && { reason: entry.reason }),
      ...(ipAddress && { ipAddress }),
      timestamp: new Date().toISOString(),
    };

    // Use provided db connection or import prisma
    const dbClient = db || (await import("@/lib/db")).default;

    await dbClient.auditLog.create({
      data: {
        tenantId: entry.tenantId,
        userId: entry.userId || null,
        entityType: entry.entityType,
        entityId: entry.entityId,
        action: entry.action,
        changes: entry.changes as any,
        metadata: auditMetadata as any,
      },
    });
  } catch (error) {
    // Log audit failures but don't throw
    console.error("[AUDIT] Failed to create audit log entry:", error);
  }
}

/**
 * Helper to calculate changes between old and new objects
 */
export function calculateChanges(
  oldObj: Record<string, any>,
  newObj: Record<string, any>
): Record<string, { old: any; new: any }> {
  const changes: Record<string, { old: any; new: any }> = {};

  // Fields to exclude from comparison (complex objects, timestamps, etc.)
  const excludeFields = new Set([
    'createdAt',
    'updatedAt',
    'salesRep',
    'portalUsers',
    'orders',
    'invoices',
    'activities',
    'accountSnapshots',
    'tasks',
    'addresses',
    'assignments',
    'sampleUsage',
    'calendarEvents',
    'tenant'
  ]);

  // Check for changed or new fields
  for (const key in newObj) {
    if (excludeFields.has(key)) continue;

    const oldValue = oldObj[key];
    const newValue = newObj[key];

    // Skip if both are null/undefined
    if (oldValue == null && newValue == null) continue;

    // Convert Decimal to number for comparison
    const oldCompare = oldValue?.constructor?.name === 'Decimal' ? Number(oldValue) : oldValue;
    const newCompare = newValue?.constructor?.name === 'Decimal' ? Number(newValue) : newValue;

    // Skip comparison for objects (to avoid serialization issues)
    if (typeof newCompare === 'object' && newCompare !== null && !(newCompare instanceof Date)) {
      continue;
    }

    // Compare dates by timestamp
    if (oldCompare instanceof Date && newCompare instanceof Date) {
      if (oldCompare.getTime() !== newCompare.getTime()) {
        changes[key] = {
          old: oldCompare.toISOString(),
          new: newCompare.toISOString()
        };
      }
      continue;
    }

    // Compare primitive values
    if (oldCompare !== newCompare) {
      changes[key] = {
        old: oldValue,
        new: newValue
      };
    }
  }

  return changes;
}

/**
 * Log customer update
 */
export async function logCustomerUpdate(
  tenantId: string,
  userId: string,
  customerId: string,
  oldData: any,
  newData: any,
  reason?: string
): Promise<void> {
  const changes = calculateChanges(oldData, newData);

  if (Object.keys(changes).length === 0) {
    return; // No changes to log
  }

  await logChange({
    tenantId,
    userId,
    action: 'UPDATE',
    entityType: 'Customer',
    entityId: customerId,
    changes,
    reason
  });
}

/**
 * Log customer creation
 */
export async function logCustomerCreate(
  tenantId: string,
  userId: string,
  customerId: string,
  data: any
): Promise<void> {
  await logChange({
    tenantId,
    userId,
    action: 'CREATE',
    entityType: 'Customer',
    entityId: customerId,
    metadata: data
  });
}

/**
 * Log customer reassignment
 */
export async function logCustomerReassignment(
  tenantId: string,
  userId: string,
  customerId: string,
  oldSalesRepId: string | null,
  newSalesRepId: string,
  reason?: string,
  db?: PrismaClient | Prisma.TransactionClient,
  request?: NextRequest,
): Promise<void> {
  await logChange(
    {
      tenantId,
      userId,
      action: "REASSIGN",
      entityType: "Customer",
      entityId: customerId,
      changes: {
        salesRepId: {
          old: oldSalesRepId,
          new: newSalesRepId,
        },
      },
      reason,
    },
    db,
    request,
  );
}

/**
 * Get audit history for a specific entity
 */
export async function getAuditHistory(params: {
  db: PrismaClient | Prisma.TransactionClient;
  tenantId: string;
  entityType: string;
  entityId: string;
  limit?: number;
}): Promise<any[]> {
  const { db, tenantId, entityType, entityId, limit = 50 } = params;

  return db.auditLog.findMany({
    where: {
      tenantId,
      entityType,
      entityId,
    },
    orderBy: {
      createdAt: "desc",
    },
    take: limit,
    include: {
      user: {
        select: {
          id: true,
          email: true,
          fullName: true,
        },
      },
    },
  });
}

/**
 * Get recent audit logs for tenant
 */
export async function getRecentAuditLogs(params: {
  db: PrismaClient | Prisma.TransactionClient;
  tenantId: string;
  limit?: number;
  entityType?: string;
  userId?: string;
}): Promise<any[]> {
  const { db, tenantId, limit = 100, entityType, userId } = params;

  return db.auditLog.findMany({
    where: {
      tenantId,
      ...(entityType && { entityType }),
      ...(userId && { userId }),
    },
    orderBy: {
      createdAt: "desc",
    },
    take: limit,
    include: {
      user: {
        select: {
          id: true,
          email: true,
          fullName: true,
        },
      },
    },
  });
}

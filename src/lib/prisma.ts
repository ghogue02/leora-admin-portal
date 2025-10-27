import { Prisma, PrismaClient } from "@prisma/client";
import { parseLocation } from "./warehouse";

const globalForPrisma = globalThis as unknown as {
  prisma?: PrismaClient;
};

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
  });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}

// ============================================================================
// WAREHOUSE MIDDLEWARE - Auto-calculate pickOrder on Inventory changes
// ============================================================================

/**
 * NOTE: Prisma middleware (prisma.$use) was deprecated in Prisma 5+
 *
 * For now, pickOrder calculation should be done in API routes using warehouse.ts
 *
 * TODO: Convert to Prisma Client Extensions ($extends) if needed in future
 * See: https://www.prisma.io/docs/concepts/components/prisma-client/client-extensions
 */

// Middleware commented out - not supported in Prisma 6+
// Use warehouse.calculatePickOrder() directly in API routes instead

/**
 * Runs the provided callback inside a transaction with the tenant context applied.
 * Ensures PostgreSQL RLS policies that depend on `app.current_tenant_id` operate correctly.
 *
 * Timeout set to 60 seconds to accommodate OpenAI API calls in copilot flows
 * while providing a safety net against stalled operations.
 */
export async function withTenant<T>(
  tenantId: string,
  callback: (tx: Prisma.TransactionClient) => Promise<T>,
) {
  return prisma.$transaction(async (tx) => {
    await tx.$executeRaw`select set_config('app.current_tenant_id', ${tenantId}, false)`;
    return callback(tx);
  }, {
    timeout: 60000, // 60 seconds - safety timeout for AI operations
  });
}

export async function runWithTransaction<T>(
  db: PrismaClient | Prisma.TransactionClient,
  callback: (tx: Prisma.TransactionClient) => Promise<T>,
) {
  if ("$transaction" in db) {
    return (db as PrismaClient).$transaction(callback);
  }

  return callback(db as Prisma.TransactionClient);
}

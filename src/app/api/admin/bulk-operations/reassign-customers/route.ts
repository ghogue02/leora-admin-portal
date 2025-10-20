import { NextRequest, NextResponse } from 'next/server';
import { withAdminSession, AdminSessionContext } from '@/lib/auth/admin';
import { PrismaClient } from '@prisma/client';

import { logChange, AuditOperation } from '@/lib/audit';
import { parseCSV } from '@/lib/csv-parser';

/**
 * POST /api/admin/bulk-operations/reassign-customers
 * Bulk reassign multiple customers to a new sales rep
 *
 * Accepts either:
 * - Direct customerIds array
 * - CSV data with customerId/accountNumber and newSalesRepId columns
 */
export async function POST(request: NextRequest) {
  return withAdminSession(request, async (context: AdminSessionContext) => {
    const { tenantId, db, user } = context;

    try {
      const body = await request.json();
      const { customerIds, csvData, salesRepId, reason } = body;

      if (!salesRepId) {
        return NextResponse.json(
          { error: 'salesRepId is required' },
          { status: 400 }
        );
      }

      // Verify sales rep exists
      const salesRep = await db.salesRep.findFirst({
        where: { id: salesRepId, tenantId },
        include: {
          user: {
            select: { fullName: true, email: true }
          }
        }
      });

      if (!salesRep) {
        return NextResponse.json(
          { error: 'Sales rep not found' },
          { status: 404 }
        );
      }

      let targetCustomerIds: string[] = [];

      // Process CSV if provided
      if (csvData) {
        const parsed = parseCSV<{ customerId?: string; accountNumber?: string }>(csvData, {
          requiredFields: [],
          validateHeaders: []
        });

        if (parsed.errors.length > 0) {
          return NextResponse.json(
            {
              error: 'CSV parsing errors',
              details: parsed.errors.map(e => `Line ${e.line}: ${e.message}`)
            },
            { status: 400 }
          );
        }

        // Extract customer IDs from CSV
        const customerLookups: Array<{ id?: string; accountNumber?: string }> = [];

        for (const row of parsed.rows) {
          if (row.customerId) {
            customerLookups.push({ id: row.customerId });
          } else if (row.accountNumber) {
            customerLookups.push({ accountNumber: row.accountNumber });
          }
        }

        // Look up customers by ID or account number
        for (const lookup of customerLookups) {
          const customer = await db.customer.findFirst({
            where: {
              tenantId,
              ...(lookup.id ? { id: lookup.id } : { accountNumber: lookup.accountNumber })
            },
            select: { id: true }
          });

          if (customer) {
            targetCustomerIds.push(customer.id);
          }
        }
      } else if (customerIds && Array.isArray(customerIds) && customerIds.length > 0) {
        targetCustomerIds = customerIds;
      } else {
        return NextResponse.json(
          { error: 'Either customerIds array or csvData is required' },
          { status: 400 }
        );
      }

      if (targetCustomerIds.length === 0) {
        return NextResponse.json(
          { error: 'No valid customers found to reassign' },
          { status: 400 }
        );
      }

      // Limit to prevent abuse
      if (targetCustomerIds.length > 10000) {
        return NextResponse.json(
          { error: 'Maximum 10,000 customers can be reassigned at once' },
          { status: 400 }
        );
      }

      const results = {
        successCount: 0,
        errors: [] as Array<{ customerId: string; customerName: string; error: string }>
      };

      // Process each customer in a transaction for consistency
      for (const customerId of targetCustomerIds) {
        try {
          await (db as PrismaClient).$transaction(async (tx) => {
            // Get customer details
            const customer = await tx.customer.findUnique({
              where: { id: customerId, tenantId },
              select: {
                id: true,
                name: true,
                salesRepId: true
              }
            });

            if (!customer) {
              results.errors.push({
                customerId,
                customerName: 'Unknown',
                error: 'Customer not found'
              });
              return;
            }

            const oldSalesRepId = customer.salesRepId;

            // Skip if already assigned to this rep
            if (oldSalesRepId === salesRepId) {
              results.successCount++;
              return;
            }

            // Mark old assignment as unassigned
            if (oldSalesRepId) {
              await tx.customerAssignment.updateMany({
                where: {
                  tenantId,
                  customerId: customer.id,
                  salesRepId: oldSalesRepId,
                  unassignedAt: null
                },
                data: {
                  unassignedAt: new Date()
                }
              });
            }

            // Create new assignment
            await tx.customerAssignment.create({
              data: {
                tenantId,
                customerId: customer.id,
                salesRepId
              }
            });

            // Update customer
            await tx.customer.update({
              where: { id: customer.id },
              data: { salesRepId }
            });

            // Log the change
            await logChange(
              {
                tenantId,
                userId: user.id,
                action: AuditOperation.REASSIGN,
                entityType: 'Customer',
                entityId: customer.id,
                changes: {
                  salesRepId: {
                    old: oldSalesRepId,
                    new: salesRepId
                  }
                },
                metadata: {
                  customerName: customer.name,
                  newSalesRepName: salesRep.user.fullName,
                  bulkOperation: true
                },
                reason
              },
              tx,
              request
            );

            results.successCount++;
          });
        } catch (error: any) {
          const customer = await db.customer.findUnique({
            where: { id: customerId },
            select: { name: true }
          });

          results.errors.push({
            customerId,
            customerName: customer?.name || 'Unknown',
            error: error.message || 'Unknown error'
          });
        }
      }

      return NextResponse.json({
        message: `Bulk reassignment completed. ${results.successCount} successful, ${results.errors.length} failed.`,
        successCount: results.successCount,
        errorCount: results.errors.length,
        errors: results.errors,
        salesRep: {
          id: salesRep.id,
          name: salesRep.user.fullName,
          territory: salesRep.territoryName
        }
      });
    } catch (error: any) {
      console.error('Error in bulk customer reassignment:', error);
      return NextResponse.json(
        { error: 'Failed to perform bulk reassignment', details: error.message },
        { status: 500 }
      );
    }
  });
}

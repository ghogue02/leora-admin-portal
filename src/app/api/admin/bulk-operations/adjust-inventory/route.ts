import { NextRequest, NextResponse } from 'next/server';
import { withAdminSession, AdminSessionContext } from '@/lib/auth/admin';
import { logChange, AuditOperation } from '@/lib/audit';
import { parseCSV } from '@/lib/csv-parser';
import { PrismaClient } from '@prisma/client';

interface InventoryAdjustment {
  skuCode: string;
  location: string;
  adjustmentType: 'add' | 'subtract' | 'set';
  quantity: number;
  reason: string;
}

/**
 * POST /api/admin/bulk-operations/adjust-inventory
 * Bulk adjust inventory levels for multiple SKUs
 *
 * Accepts either:
 * - Direct adjustments array
 * - CSV data with skuCode, location, adjustmentType, quantity, reason columns
 */
export async function POST(request: NextRequest) {
  return withAdminSession(request, async (context: AdminSessionContext) => {
    const { tenantId, db, user } = context;

    try {
      const body = await request.json();
      const { adjustments, csvData } = body;

      let targetAdjustments: InventoryAdjustment[] = [];

      // Process CSV if provided
      if (csvData) {
        const parsed = parseCSV<{
          skuCode: string;
          location: string;
          adjustmentType: string;
          quantity: string;
          reason: string;
        }>(csvData, {
          requiredFields: ['skuCode', 'location', 'adjustmentType', 'quantity', 'reason'],
          validateHeaders: ['skuCode', 'location', 'adjustmentType', 'quantity', 'reason']
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

        // Validate and transform CSV rows
        const validationErrors: string[] = [];

        for (let i = 0; i < parsed.rows.length; i++) {
          const row = parsed.rows[i];
          const lineNum = i + 2; // +2 for header and 0-index

          const adjustmentType = row.adjustmentType.toLowerCase();
          if (!['add', 'subtract', 'set'].includes(adjustmentType)) {
            validationErrors.push(
              `Line ${lineNum}: Invalid adjustmentType '${row.adjustmentType}'. Must be 'add', 'subtract', or 'set'.`
            );
            continue;
          }

          const quantity = parseInt(row.quantity, 10);
          if (isNaN(quantity) || quantity < 0) {
            validationErrors.push(
              `Line ${lineNum}: Invalid quantity '${row.quantity}'. Must be a non-negative number.`
            );
            continue;
          }

          targetAdjustments.push({
            skuCode: row.skuCode.trim(),
            location: row.location.trim(),
            adjustmentType: adjustmentType as 'add' | 'subtract' | 'set',
            quantity,
            reason: row.reason.trim()
          });
        }

        if (validationErrors.length > 0) {
          return NextResponse.json(
            { error: 'CSV validation errors', details: validationErrors },
            { status: 400 }
          );
        }
      } else if (adjustments && Array.isArray(adjustments) && adjustments.length > 0) {
        // Validate direct adjustments
        for (const adj of adjustments) {
          if (!adj.skuCode || !adj.location || !adj.adjustmentType || adj.quantity === undefined) {
            return NextResponse.json(
              { error: 'Each adjustment must have skuCode, location, adjustmentType, and quantity' },
              { status: 400 }
            );
          }

          if (!['add', 'subtract', 'set'].includes(adj.adjustmentType)) {
            return NextResponse.json(
              { error: `Invalid adjustmentType '${adj.adjustmentType}'. Must be 'add', 'subtract', or 'set'.` },
              { status: 400 }
            );
          }

          if (typeof adj.quantity !== 'number' || adj.quantity < 0) {
            return NextResponse.json(
              { error: 'Quantity must be a non-negative number' },
              { status: 400 }
            );
          }
        }

        targetAdjustments = adjustments;
      } else {
        return NextResponse.json(
          { error: 'Either adjustments array or csvData is required' },
          { status: 400 }
        );
      }

      if (targetAdjustments.length === 0) {
        return NextResponse.json(
          { error: 'No valid adjustments found' },
          { status: 400 }
        );
      }

      // Limit to prevent abuse
      if (targetAdjustments.length > 10000) {
        return NextResponse.json(
          { error: 'Maximum 10,000 adjustments can be processed at once' },
          { status: 400 }
        );
      }

      const results = {
        successCount: 0,
        errors: [] as Array<{ skuCode: string; location: string; error: string }>
      };

      // Process each adjustment
      for (const adjustment of targetAdjustments) {
        try {
          await (db as PrismaClient).$transaction(async (tx) => {
            // Find SKU
            const sku = await tx.sku.findFirst({
              where: {
                tenantId,
                code: adjustment.skuCode
              },
              select: {
                id: true,
                code: true,
                product: {
                  select: {
                    name: true
                  }
                }
              }
            });

            if (!sku) {
              results.errors.push({
                skuCode: adjustment.skuCode,
                location: adjustment.location,
                error: 'SKU not found'
              });
              return;
            }

            // Find or create inventory record
            let inventory = await tx.inventory.findFirst({
              where: {
                tenantId,
                skuId: sku.id,
                location: adjustment.location
              }
            });

            const oldQuantity = inventory?.onHand || 0;
            let newQuantity: number;

            // Calculate new quantity based on adjustment type
            switch (adjustment.adjustmentType) {
              case 'add':
                newQuantity = oldQuantity + adjustment.quantity;
                break;
              case 'subtract':
                newQuantity = oldQuantity - adjustment.quantity;
                break;
              case 'set':
                newQuantity = adjustment.quantity;
                break;
              default:
                throw new Error(`Invalid adjustment type: ${adjustment.adjustmentType}`);
            }

            // Prevent negative inventory
            if (newQuantity < 0) {
              results.errors.push({
                skuCode: adjustment.skuCode,
                location: adjustment.location,
                error: `Adjustment would result in negative inventory (${oldQuantity} -> ${newQuantity})`
              });
              return;
            }

            // Update or create inventory
            if (inventory) {
              await tx.inventory.update({
                where: { id: inventory.id },
                data: { onHand: newQuantity }
              });
            } else {
              inventory = await tx.inventory.create({
                data: {
                  tenantId,
                  skuId: sku.id,
                  location: adjustment.location,
                  onHand: newQuantity,
                  allocated: 0
                }
              });
            }

            // Log the adjustment
            await logChange(
              {
                tenantId,
                userId: user.id,
                action: AuditOperation.UPDATE,
                entityType: 'Inventory',
                entityId: inventory.id,
                changes: {
                  onHand: {
                    old: oldQuantity,
                    new: newQuantity
                  }
                },
                metadata: {
                  skuCode: sku.code,
                  productName: sku.product.name,
                  location: adjustment.location,
                  adjustmentType: adjustment.adjustmentType,
                  quantity: adjustment.quantity,
                  bulkOperation: true
                },
                reason: adjustment.reason
              },
              tx,
              request
            );

            results.successCount++;
          });
        } catch (error: unknown) {
          results.errors.push({
            skuCode: adjustment.skuCode,
            location: adjustment.location,
            error: error instanceof Error ? error.message : 'Unknown error'
          });
        }
      }

      return NextResponse.json({
        message: `Bulk inventory adjustment completed. ${results.successCount} successful, ${results.errors.length} failed.`,
        successCount: results.successCount,
        errorCount: results.errors.length,
        errors: results.errors
      });
    } catch (error: unknown) {
      console.error('Error in bulk inventory adjustment:', error);
      return NextResponse.json(
        {
          error: 'Failed to perform bulk inventory adjustment',
          details: error instanceof Error ? error.message : 'Unknown error',
        },
        { status: 500 }
      );
    }
  });
}

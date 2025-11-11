/**
 * SAGE Export Validation API
 *
 * Validates orders for SAGE export without actually performing the export.
 * Used by the UI to show validation errors before attempting export.
 *
 * @route GET /api/sage/validate?startDate=YYYY-MM-DD&endDate=YYYY-MM-DD
 */

import { NextRequest, NextResponse } from 'next/server';
import { withAdminSession, AdminSessionContext } from '@/lib/auth/admin';
import { validateOrdersForExport, OrderToValidate, SageErrorType } from '@/lib/sage/validation';
import { classifyOrderForExport, SageOrderCategory } from '@/lib/sage/classification';
import { parse } from 'date-fns';

/**
 * Validation response format
 */
interface ValidationResponse {
  valid: boolean;
  classification: {
    total: number;
    standard: number;
    sample: number;
    storage: number;
  };
  invoiceCount: number;
  recordCount: number;
  warningCount: number;
  errors: Array<{
    type: SageErrorType;
    message: string;
    invoiceId?: string;
    customerId?: string;
    skuId?: string;
    orderId?: string;
    orderLineId?: string;
    invoiceNumber?: string | null;
    customerName?: string | null;
    skuCode?: string | null;
  }>;
  warnings: Array<{
    type: SageErrorType;
    message: string;
    invoiceId?: string;
    customerId?: string;
    skuId?: string;
    orderId?: string;
    orderLineId?: string;
    invoiceNumber?: string | null;
    customerName?: string | null;
    skuCode?: string | null;
  }>;
}

/**
 * GET /api/sage/validate
 * Validate orders for SAGE export
 *
 * Query Parameters:
 * - startDate: Start date (YYYY-MM-DD format)
 * - endDate: End date (YYYY-MM-DD format)
 *
 * Returns:
 * - valid: boolean - Whether all orders passed validation
 * - invoiceCount: number - Number of invoices found
 * - recordCount: number - Number of line items
 * - errors: Array - Blocking validation errors
 * - warnings: Array - Non-blocking warnings
 */
export async function GET(request: NextRequest) {
  return withAdminSession(request, async (context: AdminSessionContext) => {
    const { tenantId, db } = context;

    try {
      const { searchParams } = new URL(request.url);

      // Parse and validate date parameters
      const startDateStr = searchParams.get('startDate');
      const endDateStr = searchParams.get('endDate');

      if (!startDateStr || !endDateStr) {
        return NextResponse.json(
          { error: 'Missing required parameters: startDate and endDate' },
          { status: 400 }
        );
      }

      // Parse dates from YYYY-MM-DD format
      let startDate: Date;
      let endDate: Date;

      try {
        startDate = parse(startDateStr, 'yyyy-MM-dd', new Date());
        startDate.setUTCHours(0, 0, 0, 0); // Start of day in UTC

        endDate = parse(endDateStr, 'yyyy-MM-dd', new Date());
        endDate.setUTCHours(23, 59, 59, 999); // End of day in UTC
      } catch (err) {
        console.error('Error parsing validation dates:', err);
        return NextResponse.json(
          { error: 'Invalid date format. Use YYYY-MM-DD' },
          { status: 400 }
        );
      }

      // Validate date range
      if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
        return NextResponse.json(
          { error: 'Invalid date values' },
          { status: 400 }
        );
      }

      if (startDate > endDate) {
        return NextResponse.json(
          { error: 'startDate must be before or equal to endDate' },
          { status: 400 }
        );
      }

      // Query orders with invoices in date range (same query as export script)
      const rawOrders = await db.order.findMany({
        where: {
          tenantId,
          invoices: {
            some: {
              issuedAt: {
                gte: startDate,
                lte: endDate,
              },
              status: {
                not: 'DRAFT', // Only validate finalized invoices
              },
            },
          },
        },
        include: {
          customer: {
            select: {
              id: true,
              name: true,
              paymentTerms: true,
              salesRepId: true,
            },
          },
          invoices: {
            where: {
              issuedAt: {
                gte: startDate,
                lte: endDate,
              },
              status: {
                not: 'DRAFT',
              },
            },
            select: {
              id: true,
              invoiceNumber: true,
            },
          },
          lines: {
            select: {
              id: true,
              skuId: true,
              quantity: true,
              unitPrice: true,
              isSample: true,
              sku: {
                select: {
                  code: true,
                  product: {
                    select: {
                      name: true,
                    },
                  },
                },
              },
            },
          },
        },
        take: 1000, // Limit to prevent performance issues
      });

      const classifiedOrders = rawOrders.map((order) => ({
        order,
        category: classifyOrderForExport({
          customer: { name: order.customer?.name ?? '' },
          lines: order.lines,
        }),
      }));

      const storageOrders = classifiedOrders
        .filter(({ category }) => category === SageOrderCategory.STORAGE)
        .map(({ order }) => order);

      const sampleOrders = classifiedOrders
        .filter(({ category }) => category === SageOrderCategory.SAMPLE)
        .map(({ order }) => order);

      const standardOrders = classifiedOrders
        .filter(({ category }) => category === SageOrderCategory.STANDARD)
        .map(({ order }) => order);

      const orders = [...standardOrders, ...sampleOrders];

      const orderMap = new Map<string, typeof orders[number]>();
      const lineMap = new Map<string, (typeof orders[number]['lines'][number])>();
      for (const order of orders) {
        orderMap.set(order.id, order);
        for (const line of order.lines) {
          lineMap.set(line.id, line);
        }
      }

      const classificationSummary = {
        total: rawOrders.length,
        standard: standardOrders.length,
        sample: sampleOrders.length,
        storage: storageOrders.length,
      };

      // Transform to validation format
      const ordersToValidate: OrderToValidate[] = orders.map(order => ({
        id: order.id,
        customerId: order.customerId,
        orderedAt: order.orderedAt,
        total: order.total ? Number(order.total) : null,
        orderLines: order.lines
          .filter(line => !line.isSample) // Skip sample items
          .map(line => ({
            id: line.id,
            skuId: line.skuId,
            quantity: line.quantity,
            unitPrice: Number(line.unitPrice),
          })),
      }));

      // Run validation using the validation library
      const validationResult = await validateOrdersForExport(ordersToValidate, db);

      // Count unique invoices and line items
      const invoiceSet = new Set<string>();
      let lineItemCount = 0;

      for (const order of orders) {
        for (const invoice of order.invoices) {
          if (invoice.invoiceNumber) {
            invoiceSet.add(invoice.invoiceNumber);
          }
        }
        // Count non-sample line items
        lineItemCount += order.lines.filter(line => !line.isSample).length;
      }

      const enrichError = (item: (typeof validationResult.errors)[number]) => {
        const order = item.orderId ? orderMap.get(item.orderId) : undefined;
        const invoiceNumber = order?.invoices[0]?.invoiceNumber ?? null;
        const customerName = order?.customer?.name ?? null;
        const line =
          (item.orderLineId && lineMap.get(item.orderLineId)) ||
          (item.skuId && order
            ? order.lines.find((orderLine) => orderLine.skuId === item.skuId)
            : undefined);
        const skuCode = line?.sku?.code ?? null;

        return { invoiceNumber, customerName, skuCode };
      };

      // Format response
      const response: ValidationResponse = {
        valid: validationResult.isValid,
        classification: classificationSummary,
        invoiceCount: invoiceSet.size,
        recordCount: lineItemCount,
        warningCount: validationResult.warnings.length,
        errors: validationResult.errors.map(error => {
          const meta = enrichError(error);
          return {
            type: error.type,
            message: error.message,
            orderId: error.orderId,
            customerId: error.customerId,
            skuId: error.skuId,
            orderLineId: error.orderLineId,
            invoiceNumber: meta.invoiceNumber,
            customerName: meta.customerName,
            skuCode: meta.skuCode,
          };
        }),
        warnings: validationResult.warnings.map(warning => {
          const meta = enrichError(warning);
          return {
            type: warning.type,
            message: warning.message,
            orderId: warning.orderId,
            customerId: warning.customerId,
            skuId: warning.skuId,
            orderLineId: warning.orderLineId,
            invoiceNumber: meta.invoiceNumber,
            customerName: meta.customerName,
            skuCode: meta.skuCode,
          };
        }),
      };

      return NextResponse.json(response);

    } catch (error) {
      console.error('Error validating SAGE export:', error);
      return NextResponse.json(
        { error: 'Failed to validate export' },
        { status: 500 }
      );
    }
  });
}

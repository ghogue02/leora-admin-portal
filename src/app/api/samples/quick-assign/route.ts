import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import prisma from '@/lib/prisma';
import { Decimal } from '@prisma/client/runtime/library';

// Validation schema
const quickAssignSchema = z.object({
  skuId: z.string().uuid(),
  customerId: z.string().uuid(),
  quantity: z.number().int().positive(),
  feedbackOptions: z.array(z.string()).optional(),
  customerResponse: z.string().optional(),
  sampleSource: z.string().optional(),
  notes: z.string().optional(),
});

export async function POST(request: NextRequest) {
  try {
    // Parse and validate request body
    const body = await request.json();
    const validatedData = quickAssignSchema.parse(body);

    // Start transaction to ensure data consistency
    const result = await prisma.$transaction(async (tx) => {
      // 1. Get SKU details
      const sku = await tx.sku.findUnique({
        where: { id: validatedData.skuId },
        include: { product: true },
      });

      if (!sku) {
        throw new Error('SKU not found');
      }

      // 2. Check sample inventory availability
      const sampleInventory = await tx.sampleInventory.findUnique({
        where: { skuId: validatedData.skuId },
      });

      if (!sampleInventory || sampleInventory.availableQuantity < validatedData.quantity) {
        throw new Error('Insufficient sample inventory');
      }

      // 3. Create SampleUsage record
      const sampleUsage = await tx.sampleUsage.create({
        data: {
          skuId: validatedData.skuId,
          customerId: validatedData.customerId,
          salesRepId: request.headers.get('x-sales-rep-id') || undefined, // From auth
          dateGiven: new Date(),
          quantity: validatedData.quantity,
          feedbackOptions: validatedData.feedbackOptions,
          customerResponse: validatedData.customerResponse,
          sampleSource: validatedData.sampleSource,
          notes: validatedData.notes,
          followUpDate: new Date(Date.now() + 21 * 24 * 60 * 60 * 1000), // 21 days default
        },
        include: {
          sku: {
            include: { product: true },
          },
          customer: true,
          salesRep: true,
        },
      });

      // 4. Deduct from sample inventory
      await tx.sampleInventory.update({
        where: { id: sampleInventory.id },
        data: {
          availableQuantity: {
            decrement: validatedData.quantity,
          },
          usedQuantity: {
            increment: validatedData.quantity,
          },
          lastUpdated: new Date(),
        },
      });

      // 5. Create Activity record automatically
      const activity = await tx.activity.create({
        data: {
          customerId: validatedData.customerId,
          salesRepId: sampleUsage.salesRepId,
          activityType: 'SAMPLE',
          activityDate: new Date(),
          notes: `Sample given: ${sku.product.name} (${sku.size}) - Qty: ${validatedData.quantity}${
            validatedData.notes ? `\nNotes: ${validatedData.notes}` : ''
          }`,
          outcome: 'PENDING',
          followUpDate: sampleUsage.followUpDate,
        },
      });

      return {
        sampleUsage,
        activityCreated: !!activity,
      };
    });

    // Log success
    console.log('[QuickAssign] Sample assigned successfully:', {
      sampleUsageId: result.sampleUsage.id,
      customerId: validatedData.customerId,
      quantity: validatedData.quantity,
    });

    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    console.error('[QuickAssign] Error:', error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          error: 'Validation failed',
          details: error.errors,
        },
        { status: 400 }
      );
    }

    if (error instanceof Error) {
      if (error.message.includes('not found') || error.message.includes('Insufficient')) {
        return NextResponse.json({ error: error.message }, { status: 404 });
      }
    }

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

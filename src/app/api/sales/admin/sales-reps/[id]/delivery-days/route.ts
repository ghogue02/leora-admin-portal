import { NextRequest, NextResponse } from "next/server";
import { withSalesSession } from "@/lib/auth/sales";
import { z } from "zod";

/**
 * PUT /api/sales/admin/sales-reps/[id]/delivery-days
 *
 * Update sales rep's delivery schedule
 * Used by territory delivery schedule admin UI
 */

const UpdateDeliveryDaysSchema = z.object({
  deliveryDays: z.array(
    z.enum(['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'])
  ),
});

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const { id: salesRepId } = params;

  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const parsed = UpdateDeliveryDaysSchema.safeParse(payload);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid request", details: parsed.error.format() },
      { status: 400 }
    );
  }

  const { deliveryDays } = parsed.data;

  return withSalesSession(
    request,
    async ({ db, tenantId, session }) => {
      // TODO: Add role check - only admins should access
      // For now, any sales user can update

      const salesRep = await db.salesRep.findFirst({
        where: {
          id: salesRepId,
          tenantId,
        },
      });

      if (!salesRep) {
        return NextResponse.json(
          { error: "Sales rep not found." },
          { status: 404 }
        );
      }

      const updated = await db.salesRep.update({
        where: { id: salesRepId },
        data: {
          deliveryDaysArray: deliveryDays,
        },
        include: {
          user: {
            select: {
              fullName: true,
            },
          },
        },
      });

      // Log activity
      const activityType = await db.activityType.findFirst({
        where: {
          tenantId,
          code: 'SETTINGS_CHANGED',
        },
        select: { id: true },
      });

      if (activityType) {
        await db.activity.create({
          data: {
            tenantId,
            activityTypeId: activityType.id,
            userId: session.user.id,
            subject: `Delivery schedule updated for ${updated.user.fullName}`,
            notes: `Territory ${updated.territoryName} delivery days set to: ${deliveryDays.join(', ')}`,
            occurredAt: new Date(),
          },
        });
      }

      return NextResponse.json({
        success: true,
        salesRepId: updated.id,
        deliveryDays: updated.deliveryDaysArray,
        message: `Delivery schedule updated for ${updated.user.fullName}`,
      });
    }
  );
}

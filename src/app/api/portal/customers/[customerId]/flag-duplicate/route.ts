import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { withPortalSession } from "@/lib/auth/portal";
import type { CustomerDuplicateStatus } from "@prisma/client";

const FlagDuplicateSchema = z.object({
  duplicateOfCustomerId: z.string().uuid().optional(),
  notes: z
    .string()
    .trim()
    .min(1, "Provide a short note so the admin team knows what to merge.")
    .max(500),
});

const STATUS_OPEN: CustomerDuplicateStatus = "OPEN";

export async function POST(
  request: NextRequest,
  { params }: { params: { customerId: string } },
) {
  const { customerId } = params;

  return withPortalSession(
    request,
    async ({ db, tenantId, session }) => {
      let payload: unknown;
      try {
        payload = await request.json();
      } catch {
        payload = {};
      }

      const parsed = FlagDuplicateSchema.safeParse(payload);
      if (!parsed.success) {
        return NextResponse.json(
          { error: "Invalid request", details: parsed.error.format() },
          { status: 400 },
        );
      }

      const { duplicateOfCustomerId, notes } = parsed.data;

      const customer = await db.customer.findFirst({
        where: {
          id: customerId,
          tenantId,
        },
        select: {
          id: true,
          name: true,
        },
      });

      if (!customer) {
        return NextResponse.json({ error: "Customer not found." }, { status: 404 });
      }

      if (duplicateOfCustomerId) {
        const duplicateTarget = await db.customer.findFirst({
          where: {
            id: duplicateOfCustomerId,
            tenantId,
          },
          select: { id: true },
        });

        if (!duplicateTarget) {
          return NextResponse.json(
            { error: "The customer you marked as the duplicate target was not found." },
            { status: 404 },
          );
        }
      }

      const existingFlag = await db.customerDuplicateFlag.findFirst({
        where: {
          tenantId,
          customerId,
          status: STATUS_OPEN,
        },
      });

      const data = {
        duplicateOfCustomerId: duplicateOfCustomerId ?? null,
        notes: notes ?? null,
        flaggedByPortalUserId: session.portalUserId,
      };

      const flag = existingFlag
        ? await db.customerDuplicateFlag.update({
            where: { id: existingFlag.id },
            data: {
              ...data,
              status: STATUS_OPEN,
            },
          })
        : await db.customerDuplicateFlag.create({
            data: {
              tenantId,
              customerId,
              ...data,
            },
          });

      await db.auditLog.create({
        data: {
          tenantId,
          userId: null,
          entityType: "Customer",
          entityId: customerId,
          action: "duplicate_flagged",
          metadata: {
            portalUserId: session.portalUserId,
            duplicateOfCustomerId,
            notes,
          },
        },
      });

      return NextResponse.json({
        success: true,
        flag,
      });
    },
    { requiredPermissions: ["portal.orders.read"] },
  );
}

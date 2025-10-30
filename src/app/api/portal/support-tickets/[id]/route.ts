import { NextRequest, NextResponse } from "next/server";
import { SupportTicketStatus, Prisma } from "@prisma/client";
import { withPortalSession } from "@/lib/auth/portal";

type UpdateTicketPayload = {
  status?: SupportTicketStatus;
  addNote?: string;
};

const ALLOWED_STATUSES: SupportTicketStatus[] = ["OPEN", "IN_PROGRESS", "RESOLVED", "CLOSED"];

export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  let payload: UpdateTicketPayload;
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  if (!payload.status && !payload.addNote) {
    return NextResponse.json({ error: "Provide status or addNote to update the ticket." }, { status: 400 });
  }

  if (payload.status && !ALLOWED_STATUSES.includes(payload.status)) {
    return NextResponse.json({ error: "Invalid status." }, { status: 400 });
  }

  return withPortalSession(
    request,
    async ({ db, tenantId, session }) => {
      const scope: Prisma.SupportTicketWhereInput = {
        id: params.id,
        tenantId,
        OR: [
          { portalUserId: session.portalUserId },
          session.portalUser.customerId ? { customerId: session.portalUser.customerId } : undefined,
        ].filter(Boolean) as Prisma.SupportTicketWhereInput["OR"],
      };

      const ticket = await db.supportTicket.findFirst({
        where: scope,
      });

      if (!ticket) {
        return NextResponse.json({ error: "Support ticket not found." }, { status: 404 });
      }

      const updateData: Prisma.SupportTicketUpdateInput = {};
      if (payload.status) {
        updateData.status = payload.status;
      }

      const updatedTicket = await db.supportTicket.update({
        where: {
          id: ticket.id,
        },
        data: updateData,
      });

      if (payload.addNote) {
        await db.activityType.upsert({
          where: {
            tenantId_code: {
              tenantId,
              code: "support_ticket_note",
            },
          },
          update: {},
          create: {
            tenantId,
            code: "support_ticket_note",
            name: "Support Ticket Note",
            description: "Notes added to support tickets",
          },
        });

        await db.activity.create({
          data: {
            tenantId,
            activityType: {
              connect: {
                tenantId_code: {
                  tenantId,
                  code: "support_ticket_note",
                },
              },
            },
            portalUserId: session.portalUserId,
            customerId: ticket.customerId,
            subject: `Support ticket ${ticket.id} updated`,
            notes: payload.addNote,
            occurredAt: new Date(),
          },
        });
      }

      return NextResponse.json({
        ticket: {
          id: updatedTicket.id,
          status: updatedTicket.status,
          priority: updatedTicket.priority,
          subject: updatedTicket.subject,
          description: updatedTicket.description,
          createdAt: updatedTicket.createdAt,
          updatedAt: updatedTicket.updatedAt,
        },
      });
    },
    { requiredPermissions: ["portal.support-tickets.manage"] },
  );
}

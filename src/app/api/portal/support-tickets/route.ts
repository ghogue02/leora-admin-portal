import { NextRequest, NextResponse } from "next/server";
import { SupportTicketStatus, Prisma } from "@prisma/client";
import { withPortalSession } from "@/lib/auth/portal";

const DEFAULT_LIMIT = 25;

type CreateTicketPayload = {
  subject?: string;
  description?: string;
  priority?: string;
};

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const pageParam = searchParams.get("page");
  const pageSizeParam = searchParams.get("pageSize") ?? searchParams.get("limit");
  const statuses = searchParams.get("status")?.split(",").map((value) => value.trim()).filter(Boolean) ?? [];
  const priorities = searchParams.get("priority")?.split(",").map((value) => value.trim()).filter(Boolean) ?? [];

  const pageSize = pageSizeParam ? Math.min(Math.max(parseInt(pageSizeParam, 10) || DEFAULT_LIMIT, 1), 100) : DEFAULT_LIMIT;
  const page = pageParam ? Math.max(parseInt(pageParam, 10) || 1, 1) : 1;
  const skip = (page - 1) * pageSize;

  return withPortalSession(
    request,
    async ({ db, tenantId, session }) => {
      const where: Prisma.SupportTicketWhereInput = {
        tenantId,
        OR: [
          { portalUserId: session.portalUserId },
          session.portalUser.customerId ? { customerId: session.portalUser.customerId } : undefined,
        ].filter(Boolean) as Prisma.SupportTicketWhereInput["OR"],
      };

      if (statuses.length) {
        const validStatuses = statuses.filter((status): status is SupportTicketStatus =>
          Object.values(SupportTicketStatus).includes(status as SupportTicketStatus),
        );
        if (validStatuses.length) {
          where.status = { in: validStatuses };
        }
      }

      if (priorities.length) {
        where.priority = { in: priorities };
      }

      const [tickets, total] = await Promise.all([
        db.supportTicket.findMany({
          where,
          include: {
            portalUser: {
              select: {
                id: true,
                fullName: true,
                email: true,
              },
            },
            customer: {
              select: {
                id: true,
                name: true,
              },
            },
          },
          orderBy: {
            createdAt: "desc",
          },
          skip,
          take: pageSize,
        }),
        db.supportTicket.count({ where }),
      ]);

      const totalPages = Math.max(Math.ceil(total / pageSize), 1);

      return NextResponse.json({
        tickets: tickets.map((ticket) => ({
          id: ticket.id,
          subject: ticket.subject,
          description: ticket.description,
          status: ticket.status,
          priority: ticket.priority,
          createdAt: ticket.createdAt,
          updatedAt: ticket.updatedAt,
          customer: ticket.customer
            ? {
                id: ticket.customer.id,
                name: ticket.customer.name,
              }
            : null,
          portalUser: ticket.portalUser
            ? {
                id: ticket.portalUser.id,
                fullName: ticket.portalUser.fullName,
                email: ticket.portalUser.email,
              }
            : null,
        })),
        meta: {
          page,
          pageSize,
          total,
          totalPages,
        },
      });
    },
    { requiredPermissions: ["portal.support-tickets.view"] },
  );
}

export async function POST(request: NextRequest) {
  let payload: CreateTicketPayload;
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const subject = payload.subject?.trim();
  const description = payload.description?.trim();
  const priority = payload.priority?.trim() ?? "normal";

  if (!subject || !description) {
    return NextResponse.json({ error: "subject and description are required." }, { status: 400 });
  }

  return withPortalSession(
    request,
    async ({ db, tenantId, session }) => {
      const ticket = await db.supportTicket.create({
        data: {
          tenantId,
          portalUserId: session.portalUserId,
          customerId: session.portalUser.customerId,
          subject,
          description,
          priority,
        },
        include: {
          portalUser: {
            select: {
              id: true,
              fullName: true,
              email: true,
            },
          },
          customer: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      });

      return NextResponse.json(
        {
          ticket: {
            id: ticket.id,
            subject: ticket.subject,
            description: ticket.description,
            status: ticket.status,
            priority: ticket.priority,
            createdAt: ticket.createdAt,
            updatedAt: ticket.updatedAt,
            customer: ticket.customer
              ? {
                  id: ticket.customer.id,
                  name: ticket.customer.name,
                }
              : null,
            portalUser: ticket.portalUser
              ? {
                  id: ticket.portalUser.id,
                  fullName: ticket.portalUser.fullName,
                  email: ticket.portalUser.email,
                }
              : null,
          },
        },
        { status: 201 },
      );
    },
    { requiredPermissions: ["portal.support-tickets.manage"] },
  );
}

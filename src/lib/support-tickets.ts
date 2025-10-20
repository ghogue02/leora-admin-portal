import type { Prisma, PrismaClient } from "@prisma/client";

export const SUPPORT_TICKET_PRIORITY_VALUES = ["low", "normal", "high", "urgent"] as const;
export type SupportTicketPriority = (typeof SUPPORT_TICKET_PRIORITY_VALUES)[number];
export const SUPPORT_TICKET_ATTACHMENT_BUCKET = "support-ticket-attachments";
const SUPPORT_ALERT_WEBHOOK = process.env.SUPPORT_ALERT_WEBHOOK;

export const supportTicketRelations = {
  customer: {
    select: {
      id: true,
      name: true,
    },
  },
  portalUser: {
    select: {
      id: true,
      email: true,
      fullName: true,
    },
  },
  attachments: {
    include: {
      uploadedBy: {
        select: {
          id: true,
          email: true,
          fullName: true,
        },
      },
    },
  },
} satisfies Prisma.SupportTicketInclude;

export type SupportTicketWithRelations = Prisma.SupportTicketGetPayload<{
  include: typeof supportTicketRelations;
}>;

export function serializeSupportTicket(ticket: SupportTicketWithRelations) {
  return {
    id: ticket.id,
    subject: ticket.subject,
    description: ticket.description,
    status: ticket.status,
    priority: ticket.priority ?? "normal",
    createdAt: ticket.createdAt.toISOString(),
    updatedAt: ticket.updatedAt.toISOString(),
    customer: ticket.customer
      ? {
          id: ticket.customer.id,
          name: ticket.customer.name,
        }
      : null,
    portalUser: ticket.portalUser
      ? {
          id: ticket.portalUser.id,
          email: ticket.portalUser.email,
          fullName: ticket.portalUser.fullName,
        }
      : null,
    attachments: ticket.attachments?.map(serializeSupportTicketAttachment) ?? [],
  };
}

const SUPPORT_TICKET_ACTIVITY_PREFIX = "support_ticket";

export async function ensureSupportTicketActivityType(
  db: PrismaClient | Prisma.TransactionClient,
  tenantId: string,
) {
  return db.activityType.upsert({
    where: {
      tenantId_code: {
        tenantId,
        code: SUPPORT_TICKET_ACTIVITY_PREFIX,
      },
    },
    update: {},
    create: {
      tenantId,
      code: SUPPORT_TICKET_ACTIVITY_PREFIX,
      name: "Support Ticket",
      description: "Support ticket updates logged by portal users.",
    },
  });
}

export async function logSupportTicketActivity(
  db: PrismaClient | Prisma.TransactionClient,
  params: {
    tenantId: string;
    portalUserId: string;
    customerId: string | null;
    ticketId: string;
    action: string;
    message: string;
  },
) {
  const activityType = await ensureSupportTicketActivityType(db, params.tenantId);
  await db.activity.create({
    data: {
      tenantId: params.tenantId,
      activityTypeId: activityType.id,
      portalUserId: params.portalUserId,
      customerId: params.customerId,
      subject: `${SUPPORT_TICKET_ACTIVITY_PREFIX}:${params.ticketId}:${params.action}`,
      notes: params.message,
      occurredAt: new Date(),
    },
  });
}

export async function logSupportTicketNote(
  db: PrismaClient | Prisma.TransactionClient,
  params: {
    tenantId: string;
    portalUserId: string;
    customerId: string | null;
    ticketId: string;
    note: string;
  },
) {
  await logSupportTicketActivity(db, {
    ...params,
    action: "note",
    message: params.note,
  });
}

const CUSTOMER_SCOPED_ROLES = new Set(["portal.viewer", "portal.buyer"]);

function hasTenantWideScope(roles: string[]) {
  return roles.some((role) => !CUSTOMER_SCOPED_ROLES.has(role));
}

export function buildSupportTicketWhere(
  tenantId: string,
  portalUserId: string,
  customerId: string | null,
  roles: string[] = [],
): Prisma.SupportTicketWhereInput {
  const hasTenantWideAccess = hasTenantWideScope(roles);

  if (hasTenantWideAccess) {
    return {
      tenantId,
    } satisfies Prisma.SupportTicketWhereInput;
  }

  if (customerId) {
    return {
      tenantId,
      customerId,
    } satisfies Prisma.SupportTicketWhereInput;
  }

  return {
    tenantId,
    portalUserId,
  } satisfies Prisma.SupportTicketWhereInput;
}

export function mapPriority(value: string | null | undefined): SupportTicketPriority | undefined {
  if (!value) return undefined;
  const normalized = value.trim().toLowerCase();
  return SUPPORT_TICKET_PRIORITY_VALUES.find((priority) => priority === normalized);
}

export const supportTicketActivityRelations = {
  portalUser: {
    select: {
      id: true,
      email: true,
      fullName: true,
    },
  },
} satisfies Prisma.ActivityInclude;

export type SupportTicketActivityWithRelations = Prisma.ActivityGetPayload<{
  include: typeof supportTicketActivityRelations;
}>;

export function serializeSupportTicketActivity(activity: SupportTicketActivityWithRelations) {
  const [, ticketId = null, action = ""] = activity.subject?.split(":") ?? [];
  return {
    id: activity.id,
    ticketId,
    action,
    notes: activity.notes ?? "",
    occurredAt: activity.occurredAt.toISOString(),
    portalUser: activity.portalUser
      ? {
          id: activity.portalUser.id,
          email: activity.portalUser.email,
          fullName: activity.portalUser.fullName,
        }
      : null,
  };
}

export function supportTicketActivitySubject(ticketId: string, action: string) {
  return `${SUPPORT_TICKET_ACTIVITY_PREFIX}:${ticketId}:${action}`;
}

export async function maybeSendSupportTicketAlert(
  db: PrismaClient | Prisma.TransactionClient,
  params: {
    tenantId: string;
    ticket: SupportTicketWithRelations;
    triggeredBy: {
      id: string;
      email: string;
      fullName: string;
    };
    reason: string;
  },
) {
  if (!SUPPORT_ALERT_WEBHOOK) {
    return;
  }

  const tenant = await db.tenant.findUnique({
    where: { id: params.tenantId },
    select: { slug: true, name: true },
  });

  const subject = params.ticket.subject;
  const priority = (params.ticket.priority ?? "normal").toLowerCase();
  if (priority !== "urgent" && priority !== "high") {
    return;
  }

  const portalUser = params.ticket.portalUser;
  const customer = params.ticket.customer;
  let reasonLabel = params.reason;
  if (reasonLabel.startsWith("priority:")) {
    reasonLabel = "Priority updated";
  } else if (reasonLabel.startsWith("status:")) {
    reasonLabel = "Status updated";
  } else {
    reasonLabel = "Ticket created";
  }

  const summaryLines = [
    `Reason: ${reasonLabel}`,
    `Priority: ${priority.toUpperCase()}`,
    `Status: ${params.ticket.status}`,
    `Subject: ${subject}`,
  ];
  if (customer) {
    summaryLines.push(`Customer: ${customer.name}`);
  }
  summaryLines.push(`Triggered by: ${params.triggeredBy.fullName} (${params.triggeredBy.email})`);

  const ticketPath = tenant?.slug
    ? `/portal/support-tickets/${params.ticket.id}`
    : `support-tickets/${params.ticket.id}`;

  try {
    const response = await fetch(SUPPORT_ALERT_WEBHOOK, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        text: [
          `🚨 Support ticket alert: ${subject}`,
          `Tenant: ${tenant?.name ?? params.tenantId}`,
          `Portal user: ${portalUser?.fullName ?? "Unknown"} (${portalUser?.email ?? "n/a"})`,
          `Link: ${ticketPath}`,
          "",
          ...summaryLines,
        ].join("\n"),
      }),
    });

    if (!response.ok) {
      console.warn("Support alert webhook responded with", response.status, response.statusText);
    }
  } catch (error) {
    console.warn("Support alert webhook failed", error);
  }
}

type SupportTicketAttachmentWithRelations = Prisma.SupportTicketAttachmentGetPayload<{
  include: {
    uploadedBy: {
      select: {
        id: true;
        email: true;
        fullName: true;
      };
    };
  };
}>;

export function serializeSupportTicketAttachment(attachment: SupportTicketAttachmentWithRelations) {
  return {
    id: attachment.id,
    fileName: attachment.fileName,
    fileSize: attachment.fileSize,
    contentType: attachment.contentType,
    uploadedAt: attachment.createdAt.toISOString(),
    uploadedBy: {
      id: attachment.uploadedBy.id,
      email: attachment.uploadedBy.email,
      fullName: attachment.uploadedBy.fullName,
    },
  };
}

import { NextRequest, NextResponse } from "next/server";
import { withSalesSession } from "@/lib/auth/sales";
import { uploadBusinessCard } from "@/lib/storage/supabase-storage";
import type { PrismaClient } from "@prisma/client";
import type { PrismaClient } from "@prisma/client";

type RouteContext = {
  params: Promise<{
    customerId: string;
    contactId: string;
  }>;
};

function sanitizeString(value: unknown) {
  if (typeof value === "string") {
    const trimmed = value.trim();
    return trimmed.length ? trimmed : null;
  }
  return null;
}

type ContactPayload = {
  fullName?: string;
  role?: string;
  phone?: string;
  mobile?: string;
  email?: string;
  notes?: string;
  businessCardImage?: string;
};

async function ensureSalesAccess(db: PrismaClient, tenantId: string, userId: string, customerId: string) {
  const salesRep = await db.salesRep.findUnique({
    where: {
      tenantId_userId: {
        tenantId,
        userId,
      },
    },
  });

  if (!salesRep) {
    return { error: NextResponse.json({ error: "Sales rep profile not found" }, { status: 404 }) };
  }

  const customer = await db.customer.findUnique({
    where: {
      id: customerId,
      tenantId,
    },
  });

  if (!customer) {
    return { error: NextResponse.json({ error: "Customer not found" }, { status: 404 }) };
  }

  if (customer.salesRepId !== salesRep.id) {
    return { error: NextResponse.json({ error: "You do not have access to this customer" }, { status: 403 }) };
  }

  return { salesRep, customer };
}

export async function DELETE(request: NextRequest, context: RouteContext) {
  return withSalesSession(request, async ({ db, tenantId, session }) => {
    const { customerId, contactId } = await context.params;
    const access = await ensureSalesAccess(db, tenantId, session.user.id, customerId);
    if ("error" in access) return access.error;

    await db.customerContact.deleteMany({
      where: {
        id: contactId,
        customerId,
        tenantId,
      },
    });

    return NextResponse.json({ success: true });
  });
}

export async function PATCH(request: NextRequest, context: RouteContext) {
  return withSalesSession(request, async ({ db, tenantId, session }) => {
    const { customerId, contactId } = await context.params;
    const access = await ensureSalesAccess(db, tenantId, session.user.id, customerId);
    if ("error" in access) return access.error;

    let payload: ContactPayload = {};
    try {
      payload = (await request.json()) as ContactPayload;
    } catch {
      // ignore
    }

    const updateData: Record<string, unknown> = {};

    if (payload.fullName !== undefined) {
      const fullName = sanitizeString(payload.fullName);
      if (!fullName) {
        return NextResponse.json({ error: "Full name is required" }, { status: 400 });
      }
      updateData.fullName = fullName;
    }

    const optionalFields = ["role", "phone", "mobile", "email", "notes"] as const;
    for (const field of optionalFields) {
      if (field in payload) {
        updateData[field] = sanitizeString(payload[field]);
      }
    }

    if (payload.businessCardImage) {
      const upload = await uploadBusinessCard(payload.businessCardImage, customerId);
      if (!upload.success) {
        return NextResponse.json(
          { error: upload.error ?? "Failed to upload business card" },
          { status: 400 }
        );
      }
      updateData.businessCardUrl = upload.url ?? null;
    }

    const contact = await db.customerContact.update({
      where: {
        id: contactId,
      },
      data: updateData,
    });

    return NextResponse.json({
      contact: {
        id: contact.id,
        fullName: contact.fullName,
        role: contact.role,
        phone: contact.phone,
        mobile: contact.mobile,
        email: contact.email,
        notes: contact.notes,
        businessCardUrl: contact.businessCardUrl,
        createdAt: contact.createdAt?.toISOString() ?? new Date().toISOString(),
      },
    });
  });
}

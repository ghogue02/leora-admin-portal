import { NextRequest, NextResponse } from "next/server";
import { withAdminSession } from "@/lib/auth/admin";
import { uploadBusinessCard } from "@/lib/storage/supabase-storage";

type RouteContext = {
  params: Promise<{
    id: string;
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

export async function DELETE(request: NextRequest, context: RouteContext) {
  return withAdminSession(request, async ({ db, tenantId }) => {
    const { id, contactId } = await context.params;
    const customerId = id;

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
  return withAdminSession(request, async ({ db, tenantId }) => {
    const { id, contactId } = await context.params;
    const customerId = id;

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
        customerId,
        tenantId,
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

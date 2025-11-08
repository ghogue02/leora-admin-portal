import { NextRequest, NextResponse } from "next/server";
import { withAdminSession } from "@/lib/auth/admin";
import { uploadBusinessCard } from "@/lib/storage/supabase-storage";

type RouteContext = {
  params: Promise<{
    id: string;
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

export async function GET(request: NextRequest, context: RouteContext) {
  return withAdminSession(request, async ({ db, tenantId }) => {
    const { id } = await context.params;
    const customerId = id;

    const contacts = await db.customerContact.findMany({
      where: {
        tenantId,
        customerId,
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    return NextResponse.json({
      contacts: contacts.map((contact) => ({
        id: contact.id,
        fullName: contact.fullName,
        role: contact.role,
        phone: contact.phone,
        mobile: contact.mobile,
        email: contact.email,
        notes: contact.notes,
        businessCardUrl: contact.businessCardUrl,
        createdAt: contact.createdAt?.toISOString() ?? new Date().toISOString(),
      })),
    });
  });
}

export async function POST(request: NextRequest, context: RouteContext) {
  return withAdminSession(request, async ({ db, tenantId }) => {
    const { id } = await context.params;
    const customerId = id;

    const customer = await db.customer.findFirst({
      where: {
        id: customerId,
        tenantId,
      },
    });

    if (!customer) {
      return NextResponse.json({ error: "Customer not found" }, { status: 404 });
    }

    let payload: ContactPayload = {};
    try {
      payload = (await request.json()) as ContactPayload;
    } catch {
      // ignore
    }

    const fullName = sanitizeString(payload.fullName);
    if (!fullName) {
      return NextResponse.json({ error: "Full name is required" }, { status: 400 });
    }

    let businessCardUrl: string | null = null;
    if (payload.businessCardImage) {
      const upload = await uploadBusinessCard(payload.businessCardImage, customerId);
      if (!upload.success) {
        return NextResponse.json(
          { error: upload.error ?? "Failed to upload business card" },
          { status: 400 }
        );
      }
      businessCardUrl = upload.url ?? null;
    }

    const contact = await db.customerContact.create({
      data: {
        tenantId,
        customerId,
        fullName,
        role: sanitizeString(payload.role),
        phone: sanitizeString(payload.phone),
        mobile: sanitizeString(payload.mobile),
        email: sanitizeString(payload.email),
        notes: sanitizeString(payload.notes),
        businessCardUrl,
      },
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

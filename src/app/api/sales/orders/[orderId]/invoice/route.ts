import { NextRequest, NextResponse } from "next/server";
import { InvoiceFormatType } from "@prisma/client";
import { withSalesSession } from "@/lib/auth/sales";

type RouteParams = {
  params: Promise<{
    orderId: string;
  }>;
};

const sanitizeString = (value: unknown) => {
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim();
  return trimmed.length ? trimmed : null;
};

const parseDueDate = (value?: unknown) => {
  if (!value || typeof value !== "string") return undefined;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    throw new Error("INVALID_DUE_DATE");
  }
  return date;
};

const parseFormat = (value?: unknown) => {
  if (!value) return undefined;
  if (typeof value !== "string") {
    throw new Error("INVALID_FORMAT");
  }
  if ((Object.values(InvoiceFormatType) as string[]).includes(value)) {
    return value as InvoiceFormatType;
  }
  throw new Error("INVALID_FORMAT");
};

export async function PUT(request: NextRequest, props: RouteParams) {
  const { orderId } = await props.params;

  return withSalesSession(
    request,
    async ({ db, tenantId, session }) => {
      const salesRepId = session.user.salesRep?.id;
      if (!salesRepId) {
        return NextResponse.json(
          { error: "Sales rep profile required" },
          { status: 403 },
        );
      }

      const payload = await request.json().catch(() => ({}));

      let dueDate: Date | undefined;
      let invoiceFormat: InvoiceFormatType | undefined;
      try {
        dueDate = parseDueDate(payload.dueDate);
        invoiceFormat = parseFormat(payload.formatType);
      } catch (error) {
        if (error instanceof Error && error.message === "INVALID_DUE_DATE") {
          return NextResponse.json(
            { error: "Please provide a valid due date." },
            { status: 400 },
          );
        }
        if (error instanceof Error && error.message === "INVALID_FORMAT") {
          return NextResponse.json(
            { error: "Invalid invoice format type." },
            { status: 400 },
          );
        }
        throw error;
      }

      const order = await db.order.findFirst({
        where: {
          id: orderId,
          tenantId,
          customer: {
            salesRepId,
          },
        },
        select: {
          id: true,
          customer: {
            select: {
              paymentTerms: true,
              name: true,
            },
          },
          invoices: {
            select: {
              id: true,
            },
            orderBy: {
              createdAt: "desc",
            },
            take: 1,
          },
        },
      });

      if (!order || !order.invoices.length) {
        return NextResponse.json(
          { error: "Invoice not found for this order." },
          { status: 404 },
        );
      }

      const invoiceId = order.invoices[0].id;

      const updatedInvoice = await db.invoice.update({
        where: {
          id: invoiceId,
        },
        data: {
          invoiceFormatType: invoiceFormat ?? undefined,
          shippingMethod:
            payload.shippingMethod !== undefined
              ? sanitizeString(payload.shippingMethod)
              : undefined,
          specialInstructions:
            payload.specialInstructions !== undefined
              ? sanitizeString(payload.specialInstructions)
              : undefined,
          poNumber:
            payload.poNumber !== undefined
              ? sanitizeString(payload.poNumber)
              : undefined,
          paymentTermsText:
            payload.paymentTermsText !== undefined
              ? sanitizeString(payload.paymentTermsText) ??
                order.customer.paymentTerms ??
                "Net 30"
              : undefined,
          dueDate: dueDate ?? undefined,
          updatedAt: new Date(),
        },
        select: {
          id: true,
          invoiceNumber: true,
          status: true,
          total: true,
          dueDate: true,
          invoiceFormatType: true,
          shippingMethod: true,
          specialInstructions: true,
          poNumber: true,
          paymentTermsText: true,
        },
      });

      let regenerated = false;
      try {
        const resp = await fetch(
          `${request.nextUrl.origin}/api/invoices/${invoiceId}/regenerate`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Cookie: request.headers.get("cookie") ?? "",
            },
          },
        );
        regenerated = resp.ok;
      } catch (error) {
        console.error("Failed to regenerate invoice", error);
      }

      return NextResponse.json({
        invoice: {
          ...updatedInvoice,
          total:
            typeof updatedInvoice.total === "object" && updatedInvoice.total !== null
              ? Number(updatedInvoice.total)
              : updatedInvoice.total,
        },
        regenerated,
      });
    },
  );
}

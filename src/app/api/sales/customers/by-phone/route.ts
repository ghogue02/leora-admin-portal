import { NextRequest, NextResponse } from "next/server";
import { withSalesSession } from "@/lib/auth/sales";

export async function GET(request: NextRequest) {
  return withSalesSession(
    request,
    async ({ db, tenantId }) => {
      const searchParams = request.nextUrl.searchParams;
      const phone = searchParams.get("phone");

      if (!phone) {
        return NextResponse.json(
          { error: "Phone parameter is required" },
          { status: 400 }
        );
      }

      // Normalize phone number (remove non-digits)
      const normalizedPhone = phone.replace(/\D/g, '');

      // Search for customer by phone
      const customer = await db.customer.findFirst({
        where: {
          tenantId,
          OR: [
            { phone: { contains: normalizedPhone } },
            { phone: { contains: phone } },
          ],
        },
        select: {
          id: true,
          name: true,
          phone: true,
          accountNumber: true,
          tenantId: true,
          salesRepId: true,
        },
      });

      if (!customer) {
        return NextResponse.json(
          { error: "Customer not found" },
          { status: 404 }
        );
      }

      return NextResponse.json({ customer });
    }
  );
}

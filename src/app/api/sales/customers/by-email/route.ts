import { NextRequest, NextResponse } from "next/server";
import { withSalesSession } from "@/lib/auth/sales";

export async function GET(request: NextRequest) {
  return withSalesSession(
    request,
    async ({ db, tenantId }) => {
      const searchParams = request.nextUrl.searchParams;
      const email = searchParams.get("email");

      if (!email) {
        return NextResponse.json(
          { error: "Email parameter is required" },
          { status: 400 }
        );
      }

      // Search for customer by email
      const customer = await db.customer.findFirst({
        where: {
          tenantId,
          email: {
            equals: email,
            mode: 'insensitive',
          },
        },
        select: {
          id: true,
          name: true,
          email: true,
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

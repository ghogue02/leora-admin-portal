import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

// GET - Get current user's territory
export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Find user
    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Find territory assigned to this user
    const territory = await prisma.territory.findFirst({
      where: {
        salesRepId: user.id,
        isActive: true,
      },
    });

    if (!territory) {
      return NextResponse.json({ territory: null });
    }

    // Get customers in this territory
    const customers = await prisma.customer.findMany({
      where: { territory: territory.name },
      select: {
        id: true,
        name: true,
        city: true,
        state: true,
        phone: true,
        latitude: true,
        longitude: true,
        status: true,
      },
      orderBy: {
        name: "asc",
      },
    });

    // Get last order date for each customer
    const customersWithLastOrder = await Promise.all(
      customers.map(async (customer) => {
        const lastOrder = await prisma.order.findFirst({
          where: { customerId: customer.id },
          orderBy: { orderDate: "desc" },
          select: { orderDate: true },
        });

        return {
          ...customer,
          lastOrderDate: lastOrder?.orderDate || null,
        };
      })
    );

    return NextResponse.json({
      territory: {
        ...territory,
        boundary: JSON.parse(territory.boundary as string),
        customers: customersWithLastOrder,
      },
    });
  } catch (error) {
    console.error("Error fetching my territory:", error);
    return NextResponse.json(
      { error: "Failed to fetch territory" },
      { status: 500 }
    );
  }
}

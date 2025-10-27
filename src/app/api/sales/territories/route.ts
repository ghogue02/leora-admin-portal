import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

// GET - List all territories
export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const territories = await prisma.$queryRaw`
      SELECT
        t.id,
        t.name,
        t.salesRepId,
        u.name as salesRepName,
        t.boundary,
        t.color,
        t.isActive,
        t.createdAt,
        t.updatedAt,
        COUNT(DISTINCT c.id) as customerCount,
        COUNT(DISTINCT CASE WHEN c.status = 'ACTIVE' THEN c.id END) as activeCustomerCount,
        COALESCE(SUM(CASE WHEN o.orderDate >= NOW() - INTERVAL '30 days' THEN o.totalAmount ELSE 0 END), 0) as revenue30Days,
        COALESCE(SUM(CASE WHEN o.orderDate >= NOW() - INTERVAL '90 days' THEN o.totalAmount ELSE 0 END), 0) as revenue90Days,
        COALESCE(SUM(CASE WHEN o.orderDate >= NOW() - INTERVAL '365 days' THEN o.totalAmount ELSE 0 END), 0) as revenue365Days,
        MAX(o.orderDate) as lastActivityDate
      FROM Territory t
      LEFT JOIN User u ON t.salesRepId = u.id
      LEFT JOIN Customer c ON c.territory = t.name
      LEFT JOIN "Order" o ON o.customerId = c.id
      WHERE t.isActive = true
      GROUP BY t.id, t.name, t.salesRepId, u.name, t.boundary, t.color, t.isActive, t.createdAt, t.updatedAt
      ORDER BY t.name
    `;

    return NextResponse.json({ territories });
  } catch (error) {
    console.error("Error fetching territories:", error);
    return NextResponse.json(
      { error: "Failed to fetch territories" },
      { status: 500 }
    );
  }
}

// POST - Create new territory
export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { name, salesRepId, boundary, color } = body;

    if (!name || !boundary || boundary.length < 3) {
      return NextResponse.json(
        { error: "Name and boundary (min 3 points) are required" },
        { status: 400 }
      );
    }

    const territory = await prisma.territory.create({
      data: {
        name,
        salesRepId: salesRepId || null,
        boundary: JSON.stringify(boundary),
        color: color || "#3B82F6",
        isActive: true,
      },
    });

    return NextResponse.json({ territory }, { status: 201 });
  } catch (error) {
    console.error("Error creating territory:", error);
    return NextResponse.json(
      { error: "Failed to create territory" },
      { status: 500 }
    );
  }
}

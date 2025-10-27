import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

// GET - Territory analytics and performance
export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const performance = await prisma.$queryRaw`
      SELECT
        t.id as territoryId,
        t.name as territoryName,
        u.name as salesRepName,
        COUNT(DISTINCT c.id) as customerCount,
        COALESCE(SUM(CASE WHEN o.orderDate >= NOW() - INTERVAL '30 days' THEN o.totalAmount ELSE 0 END), 0) as revenue30Days,
        COALESCE(SUM(CASE WHEN o.orderDate >= NOW() - INTERVAL '90 days' THEN o.totalAmount ELSE 0 END), 0) as revenue90Days,
        COALESCE(SUM(CASE WHEN o.orderDate >= NOW() - INTERVAL '365 days' THEN o.totalAmount ELSE 0 END), 0) as revenue365Days,
        CASE
          WHEN SUM(CASE WHEN o.orderDate >= NOW() - INTERVAL '60 days' AND o.orderDate < NOW() - INTERVAL '30 days' THEN o.totalAmount ELSE 0 END) > 0
          THEN (
            (SUM(CASE WHEN o.orderDate >= NOW() - INTERVAL '30 days' THEN o.totalAmount ELSE 0 END) -
             SUM(CASE WHEN o.orderDate >= NOW() - INTERVAL '60 days' AND o.orderDate < NOW() - INTERVAL '30 days' THEN o.totalAmount ELSE 0 END)) /
            SUM(CASE WHEN o.orderDate >= NOW() - INTERVAL '60 days' AND o.orderDate < NOW() - INTERVAL '30 days' THEN o.totalAmount ELSE 0 END) * 100
          )
          ELSE 0
        END as growthRate,
        CASE
          WHEN COUNT(DISTINCT CASE WHEN c.status = 'ACTIVE' THEN c.id END) > 0
          THEN COALESCE(SUM(CASE WHEN o.orderDate >= NOW() - INTERVAL '365 days' THEN o.totalAmount ELSE 0 END), 0) /
               COUNT(DISTINCT CASE WHEN c.status = 'ACTIVE' THEN c.id END)
          ELSE 0
        END as avgOrderValue,
        CASE
          WHEN COUNT(DISTINCT c.id) > 0
          THEN (COUNT(DISTINCT CASE WHEN c.status = 'ACTIVE' THEN c.id END)::float / COUNT(DISTINCT c.id)::float * 100)
          ELSE 0
        END as coverage
      FROM Territory t
      LEFT JOIN User u ON t.salesRepId = u.id
      LEFT JOIN Customer c ON c.territory = t.name
      LEFT JOIN "Order" o ON o.customerId = c.id
      WHERE t.isActive = true
      GROUP BY t.id, t.name, u.name
      ORDER BY revenue30Days DESC
    `;

    return NextResponse.json({ performance });
  } catch (error) {
    console.error("Error fetching territory analytics:", error);
    return NextResponse.json(
      { error: "Failed to fetch analytics" },
      { status: 500 }
    );
  }
}

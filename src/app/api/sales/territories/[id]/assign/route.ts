import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

// POST - Assign customers to territory
export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { customerIds, overwriteExisting } = body;

    if (!Array.isArray(customerIds) || customerIds.length === 0) {
      return NextResponse.json(
        { error: "Customer IDs array is required" },
        { status: 400 }
      );
    }

    // Get the territory
    const territory = await prisma.territory.findUnique({
      where: { id: params.id },
    });

    if (!territory) {
      return NextResponse.json({ error: "Territory not found" }, { status: 404 });
    }

    // Build update query based on overwrite flag
    const whereClause = overwriteExisting
      ? { id: { in: customerIds } }
      : {
          id: { in: customerIds },
          OR: [{ territory: null }, { territory: territory.name }],
        };

    // Update customers
    const result = await prisma.customer.updateMany({
      where: whereClause,
      data: {
        territory: territory.name,
      },
    });

    return NextResponse.json({
      success: true,
      assignedCount: result.count,
    });
  } catch (error) {
    console.error("Error assigning customers:", error);
    return NextResponse.json(
      { error: "Failed to assign customers" },
      { status: 500 }
    );
  }
}

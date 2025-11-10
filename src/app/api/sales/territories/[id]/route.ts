import { NextResponse } from "next/server";
import { getServerSession } from '@/lib/auth';
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

// GET - Get single territory
export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession();

    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const territory = await prisma.territory.findUnique({
      where: { id: params.id },
      include: {
        salesRep: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    if (!territory) {
      return NextResponse.json({ error: "Territory not found" }, { status: 404 });
    }

    // Get customers in this territory
    const customers = await prisma.customer.findMany({
      where: { territory: territory.name },
      select: {
        id: true,
        name: true,
        city: true,
        state: true,
        latitude: true,
        longitude: true,
        status: true,
      },
    });

    return NextResponse.json({
      territory: {
        ...territory,
        boundary: JSON.parse(territory.boundary as string),
        customers,
      },
    });
  } catch (error) {
    console.error("Error fetching territory:", error);
    return NextResponse.json(
      { error: "Failed to fetch territory" },
      { status: 500 }
    );
  }
}

// PUT - Update territory
export async function PUT(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession();

    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { name, salesRepId, boundary, color, isActive } = body;

    const territory = await prisma.territory.update({
      where: { id: params.id },
      data: {
        name,
        salesRepId: salesRepId || null,
        boundary: boundary ? JSON.stringify(boundary) : undefined,
        color,
        isActive,
      },
    });

    return NextResponse.json({ territory });
  } catch (error) {
    console.error("Error updating territory:", error);
    return NextResponse.json(
      { error: "Failed to update territory" },
      { status: 500 }
    );
  }
}

// DELETE - Delete territory
export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession();

    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Soft delete - just mark as inactive
    await prisma.territory.update({
      where: { id: params.id },
      data: { isActive: false },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting territory:", error);
    return NextResponse.json(
      { error: "Failed to delete territory" },
      { status: 500 }
    );
  }
}

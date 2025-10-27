import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import prisma from "@/lib/prisma";

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const filters = await prisma.savedCallPlanFilter.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: "desc" },
    });

    const formattedFilters = filters.map((filter) => ({
      id: filter.id,
      name: filter.name,
      filters: filter.filterConfig,
    }));

    return NextResponse.json({ filters: formattedFilters });
  } catch (error) {
    console.error("Error fetching saved filters:", error);
    return NextResponse.json(
      { error: "Failed to fetch saved filters" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const { name, filterConfig } = await request.json();

    const savedFilter = await prisma.savedCallPlanFilter.create({
      data: {
        userId: user.id,
        name,
        filterConfig,
      },
    });

    return NextResponse.json({
      filter: {
        id: savedFilter.id,
        name: savedFilter.name,
        filters: savedFilter.filterConfig,
      },
    });
  } catch (error) {
    console.error("Error saving filter:", error);
    return NextResponse.json({ error: "Failed to save filter" }, { status: 500 });
  }
}

import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db";
import type { Prisma } from "@prisma/client";

/**
 * GET /api/admin/triggers/[id]/tasks
 * List tasks created by this trigger
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    const tenantId = request.headers.get("x-tenant-id");
    const triggerId = params.id;

    if (!tenantId) {
      return NextResponse.json(
        { error: "Missing tenant ID" },
        { status: 400 },
      );
    }

    // Parse query parameters
    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status");
    const limit = parseInt(searchParams.get("limit") || "50");
    const offset = parseInt(searchParams.get("offset") || "0");

    // Build where clause
    const where: Prisma.TriggeredTaskWhereInput = {
      tenantId,
      triggerId,
    };

    if (status) {
      where.task = {
        status,
      };
    }

    // Get triggered tasks with related data
    const triggeredTasks = await prisma.triggeredTask.findMany({
      where,
      include: {
        task: {
          include: {
            customer: {
              select: {
                id: true,
                name: true,
                accountNumber: true,
              },
            },
            user: {
              select: {
                id: true,
                fullName: true,
                email: true,
              },
            },
          },
        },
        customer: {
          select: {
            id: true,
            name: true,
            accountNumber: true,
          },
        },
      },
      orderBy: {
        triggeredAt: "desc",
      },
      take: limit,
      skip: offset,
    });

    // Get total count
    const totalCount = await prisma.triggeredTask.count({
      where,
    });

    return NextResponse.json({
      tasks: triggeredTasks,
      pagination: {
        total: totalCount,
        limit,
        offset,
        hasMore: offset + limit < totalCount,
      },
    });
  } catch (error) {
    console.error("[Triggers API] Error listing triggered tasks:", error);
    return NextResponse.json(
      { error: "Failed to list triggered tasks" },
      { status: 500 },
    );
  }
}

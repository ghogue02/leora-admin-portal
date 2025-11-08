/**
 * Email Lists API
 * GET /api/sales/marketing/lists - List all email lists
 * POST /api/sales/marketing/lists - Create new email list
 */

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { populateSmartList } from "@/lib/marketing/smart-lists";

const listQuerySchema = z.object({
  ownerId: z.string().uuid().optional(),
  isSmartList: z.enum(["true", "false"]).optional(),
});

const createListSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
  isSmartList: z.boolean().optional(),
  smartCriteria: z.unknown().optional(),
});

export async function GET(request: NextRequest) {
  try {
    // TODO: Get tenantId from auth session
    const tenantId = request.headers.get("x-tenant-id") || "";
    const params = listQuerySchema.safeParse({
      ownerId: request.nextUrl.searchParams.get("ownerId"),
      isSmartList: request.nextUrl.searchParams.get("isSmartList"),
    });

    const where: Record<string, unknown> = { tenantId };
    if (params.success) {
      if (params.data.ownerId) {
        where.ownerId = params.data.ownerId;
      }
      if (params.data.isSmartList) {
        where.isSmartList = params.data.isSmartList === "true";
      }
    }

    const lists = await prisma.emailList.findMany({
      where,
      include: {
        _count: {
          select: { members: true },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    return NextResponse.json(lists);
  } catch (error) {
    console.error("Error fetching email lists:", error);
    return NextResponse.json(
      { error: "Failed to fetch email lists" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const tenantId = request.headers.get("x-tenant-id") || "";
    const userId = request.headers.get("x-user-id") || "";
    const body = createListSchema.parse(await request.json());

    // Create email list
    const list = await prisma.emailList.create({
      data: {
        tenantId,
        name: body.name,
        description: body.description ?? "",
        ownerId: userId,
        isSmartList: body.isSmartList ?? false,
        smartCriteria: body.smartCriteria ?? null,
      },
    });

    // If smart list, populate immediately
    if (body.isSmartList && body.smartCriteria) {
      await populateSmartList(tenantId, list.id);
    }

    return NextResponse.json(list, { status: 201 });
  } catch (error) {
    console.error("Error creating email list:", error);
    return NextResponse.json(
      { error: "Failed to create email list" },
      { status: 500 }
    );
  }
}

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { withSalesSession } from "@/lib/auth/sales";

const includeTemplatesSchema = z.enum(["true", "false"]).optional();
const categorySchema = z.string().optional();
const createQuerySchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
  queryText: z.string().min(1),
  category: z.string().optional(),
  tags: z.array(z.string()).optional(),
  isShared: z.boolean().optional(),
});

// GET /api/sales/leora/queries - List all saved queries for current user
export async function GET(request: NextRequest) {
  return withSalesSession(
    request,
    async ({ tenantId, session }) => {
      try {
        const userId = session.user.id;
        const { searchParams } = new URL(request.url);
        const includeTemplatesParam = includeTemplatesSchema.safeParse(
          searchParams.get("includeTemplates") ?? undefined
        );
        const category = categorySchema.parse(searchParams.get("category") ?? undefined);

        const whereClause: Record<string, unknown> = {
          tenantId,
          OR: [
            { userId },
            { isShared: true },
          ],
        };

        if (!includeTemplatesParam.success || includeTemplatesParam.data !== "true") {
          whereClause.isTemplate = false;
        }

        if (category) {
          whereClause.category = category;
        }

        const queries = await prisma.savedQuery.findMany({
          where: whereClause,
          orderBy: [
            { lastUsedAt: "desc" },
            { createdAt: "desc" },
          ],
          select: {
            id: true,
            name: true,
            description: true,
            queryText: true,
            isTemplate: true,
            isShared: true,
            category: true,
            tags: true,
            usageCount: true,
            lastUsedAt: true,
            createdAt: true,
            user: {
              select: {
                fullName: true,
                email: true,
              },
            },
          },
        });

        return NextResponse.json({ queries });
      } catch (error) {
        console.error("Error fetching saved queries:", error);
        return NextResponse.json(
          { error: "Failed to fetch saved queries" },
          { status: 500 }
        );
      }
    },
    { requireSalesRep: false },
  );
}

// POST /api/sales/leora/queries - Create a new saved query
export async function POST(request: NextRequest) {
  return withSalesSession(
    request,
    async ({ tenantId, session }) => {
      try {
        const userId = session.user.id;
        const body = createQuerySchema.parse(await request.json());

        const query = await prisma.savedQuery.create({
          data: {
            tenantId,
            userId,
            name: body.name,
            description: body.description ?? "",
            queryText: body.queryText,
            category: body.category ?? null,
            tags: body.tags ?? [],
            isShared: body.isShared ?? false,
          },
          include: {
            user: {
              select: {
                fullName: true,
                email: true,
              },
            },
          },
        });

        return NextResponse.json({ query }, { status: 201 });
      } catch (error) {
        console.error("Error creating saved query:", error);
        return NextResponse.json(
          { error: "Failed to create saved query" },
          { status: 500 }
        );
      }
    },
    { requireSalesRep: false },
  );
}

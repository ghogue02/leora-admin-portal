"use server";

import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { withAdminSession } from "@/lib/auth/admin";
import {
  activitySampleItemSelect,
  serializeActivityRecord,
} from "@/app/api/sales/activities/_helpers";

const DEFAULT_PAGE_SIZE = 25;
const MAX_PAGE_SIZE = 100;

export async function GET(request: NextRequest) {
  return withAdminSession(request, async ({ db, tenantId }) => {
    const searchParams = request.nextUrl.searchParams;
    const page = Math.max(1, Number.parseInt(searchParams.get("page") ?? "1", 10));
    const rawPageSize = Number.parseInt(searchParams.get("pageSize") ?? `${DEFAULT_PAGE_SIZE}`, 10);
    const pageSize = Math.min(Math.max(1, Number.isNaN(rawPageSize) ? DEFAULT_PAGE_SIZE : rawPageSize), MAX_PAGE_SIZE);
    const salesRepId = searchParams.get("salesRepId")?.trim() || null;
    const search = searchParams.get("search")?.trim();
    const followUpFilter = searchParams.get("followUp")?.trim();
    const dateFromParam = searchParams.get("dateFrom");
    const dateToParam = searchParams.get("dateTo");

    const where: Prisma.ActivityWhereInput = {
      tenantId,
    };

    if (salesRepId) {
      where.userId = salesRepId;
    }

    if (search) {
      where.OR = [
        { subject: { contains: search, mode: "insensitive" } },
        { notes: { contains: search, mode: "insensitive" } },
        {
          customer: {
            name: {
              contains: search,
              mode: "insensitive",
            },
          },
        },
        {
          activityType: {
            name: {
              contains: search,
              mode: "insensitive",
            },
          },
        },
      ];
    }

    if (dateFromParam || dateToParam) {
      where.occurredAt = {};
      if (dateFromParam) {
        const fromDate = new Date(dateFromParam);
        if (!Number.isNaN(fromDate.getTime())) {
          where.occurredAt.gte = fromDate;
        }
      }
      if (dateToParam) {
        const toDate = new Date(dateToParam);
        if (!Number.isNaN(toDate.getTime())) {
          // include entire day
          toDate.setHours(23, 59, 59, 999);
          where.occurredAt.lte = toDate;
        }
      }
    }

    if (followUpFilter === "open") {
      where.sampleItems = {
        some: {
          followUpNeeded: true,
          followUpCompletedAt: null,
        },
      };
    } else if (followUpFilter === "with-samples") {
      where.sampleItems = {
        some: {},
      };
    }

    const skip = (page - 1) * pageSize;

    const [activities, totalCount] = await Promise.all([
      db.activity.findMany({
        where,
        orderBy: {
          occurredAt: "desc",
        },
        include: {
          activityType: {
            select: {
              id: true,
              name: true,
              code: true,
            },
          },
          customer: {
            select: {
              id: true,
              name: true,
            },
          },
          user: {
            select: {
              id: true,
              fullName: true,
              email: true,
            },
          },
          sampleItems: {
            select: activitySampleItemSelect,
          },
        },
        skip,
        take: pageSize,
      }),
      db.activity.count({ where }),
    ]);

    return NextResponse.json({
      activities: activities.map(serializeActivityRecord),
      pagination: {
        page,
        pageSize,
        totalCount,
        totalPages: Math.max(1, Math.ceil(totalCount / pageSize)),
      },
    });
  });
}

import { NextRequest, NextResponse } from "next/server";
import { ProductExportFormat } from "@prisma/client";

import { withSalesSession } from "@/lib/auth/sales";
import { enqueueJob } from "@/lib/job-queue";

const formatValues = new Set(
  Object.values(ProductExportFormat ?? {}).map((value) => value.toUpperCase()),
);

export async function POST(request: NextRequest) {
  return withSalesSession(
    request,
    async ({ tenantId, db, session }) => {
      const body = await request.json().catch(() => null);
      const requestedFormat = typeof body?.format === "string" ? body.format.toUpperCase() : "CSV";
      if (!formatValues.has(requestedFormat)) {
        return NextResponse.json(
          { error: "Unsupported export format." },
          { status: 400 },
        );
      }

      const filters = body?.filters && typeof body.filters === "object" ? body.filters : {};

      const exportJob = await db.productExportJob.create({
        data: {
          tenantId,
          createdByUserId: session.user.id,
          format: requestedFormat as ProductExportFormat,
          filters,
        },
      });

      const queueId = await enqueueJob("product_export", {
        exportJobId: exportJob.id,
      });

      await db.productExportJob.update({
        where: { id: exportJob.id },
        data: {
          jobId: queueId,
        },
      });

      const refreshedJob = await db.productExportJob.findUnique({
        where: { id: exportJob.id },
      });

      return NextResponse.json({ job: refreshedJob });
    },
    { requireSalesRep: false },
  );
}

export async function GET(request: NextRequest) {
  return withSalesSession(
    request,
    async ({ tenantId, db, session }) => {
      const jobId = request.nextUrl.searchParams.get("jobId");
      if (jobId) {
        const job = await db.productExportJob.findFirst({
          where: {
            id: jobId,
            tenantId,
            createdByUserId: session.user.id,
          },
        });
        if (!job) {
          return NextResponse.json({ error: "Job not found." }, { status: 404 });
        }
        return NextResponse.json({ job });
      }

      const jobs = await db.productExportJob.findMany({
        where: {
          tenantId,
          createdByUserId: session.user.id,
        },
        orderBy: { createdAt: "desc" },
        take: 25,
      });

      return NextResponse.json({ jobs });
    },
    { requireSalesRep: false },
  );
}

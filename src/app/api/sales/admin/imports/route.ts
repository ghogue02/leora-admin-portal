import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { Prisma } from "@prisma/client";
import { withAdminSession } from "@/lib/auth/admin";
import { createImportBatch, listImportBatches } from "@/lib/imports/batch-service";

const createBatchSchema = z.object({
  dataType: z.string().min(1, "dataType is required"),
  source: z.string().min(1, "source is required"),
  templateId: z.string().uuid().optional(),
  fileKey: z.string().min(1).optional(),
  checksum: z.string().min(8).optional(),
  fileName: z.string().min(1).optional(),
  fileSize: z.number().int().nonnegative().optional(),
  metadata: z.record(z.any()).optional(),
  notes: z.string().optional(),
});

export async function GET(request: NextRequest) {
  return withAdminSession(request, async ({ db, tenantId }) => {
    const { searchParams } = new URL(request.url);
    const limit = Math.min(parseInt(searchParams.get("limit") || "20", 10), 100);
    const offset = Math.max(parseInt(searchParams.get("offset") || "0", 10), 0);
    const dataType = searchParams.get("dataType") || undefined;
    const status = searchParams.get("status")
      ?.split(",")
      .map((value) => value.trim())
      .filter(Boolean);

    const batches = await listImportBatches(db, {
      tenantId,
      dataType,
      status,
      limit,
      offset,
    });

    return NextResponse.json({ data: batches });
  });
}

export async function POST(request: NextRequest) {
  return withAdminSession(request, async ({ db, tenantId, user }) => {
    const body = await request.json().catch(() => null);
    if (!body) {
      return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
    }

    const parsed = createBatchSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        {
          error: "Validation failed",
          issues: parsed.error.issues,
        },
        { status: 400 },
      );
    }

    const summaryPayload: Record<string, unknown> = {};
    if (parsed.data.fileName) summaryPayload.fileName = parsed.data.fileName;
    if (typeof parsed.data.fileSize === "number") summaryPayload.fileSize = parsed.data.fileSize;
    if (parsed.data.metadata) summaryPayload.metadata = parsed.data.metadata;
    if (parsed.data.notes) summaryPayload.notes = parsed.data.notes;

    const summary =
      Object.keys(summaryPayload).length > 0
        ? (summaryPayload as Prisma.JsonObject)
        : undefined;

    const batch = await createImportBatch(db, {
      tenantId,
      dataType: parsed.data.dataType,
      source: parsed.data.source,
      templateId: parsed.data.templateId,
      fileKey: parsed.data.fileKey,
      checksum: parsed.data.checksum,
      summary,
      initiatedById: user.id,
    });

    return NextResponse.json({ data: batch }, { status: 201 });
  });
}

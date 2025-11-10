import { NextRequest, NextResponse } from "next/server";
import { withAdminSession } from "@/lib/auth/admin";
import { createImportBatch } from "@/lib/imports/batch-service";
import { uploadImportFile } from "@/lib/imports/upload";
import { enqueueJob } from "@/lib/job-queue";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  return withAdminSession(request, async ({ db, tenantId, user }) => {
    const formData = await request.formData();

    const fileEntry = formData.get("file");
    if (!(fileEntry instanceof File)) {
      return NextResponse.json({ error: "CSV file is required." }, { status: 400 });
    }

    const dataType = String(formData.get("dataType") ?? "").trim();
    if (!dataType) {
      return NextResponse.json({ error: "dataType is required" }, { status: 400 });
    }

    const source = String(formData.get("source") ?? "portal.upload").trim() || "portal.upload";
    const templateIdRaw = formData.get("templateId");
    const templateId =
      typeof templateIdRaw === "string" && templateIdRaw.trim().length > 0 ? templateIdRaw.trim() : undefined;
    const notes = typeof formData.get("notes") === "string" ? formData.get("notes")!.trim() : undefined;

    let metadata: Record<string, unknown> | undefined;
    const metadataRaw = formData.get("metadata");
    if (typeof metadataRaw === "string" && metadataRaw.trim()) {
      try {
        metadata = JSON.parse(metadataRaw);
      } catch {
        return NextResponse.json({ error: "metadata must be valid JSON" }, { status: 400 });
      }
    }

    try {
      const uploaded = await uploadImportFile(fileEntry, tenantId);

      const summaryPayload: Record<string, unknown> = {
        fileName: fileEntry.name,
        fileSize: uploaded.size,
        contentType: uploaded.contentType,
      };
      if (notes) summaryPayload.notes = notes;
      if (metadata) summaryPayload.metadata = metadata;
      if (uploaded.downloadUrl) summaryPayload.downloadUrl = uploaded.downloadUrl;

      const batch = await createImportBatch(db, {
        tenantId,
        dataType,
        source,
        templateId,
        fileKey: uploaded.fileKey,
        checksum: uploaded.checksum,
        summary: summaryPayload,
        initiatedById: user.id,
      });
      await enqueueJob("bulk_import", { batchId: batch.id });

      return NextResponse.json(
        {
          data: batch,
        },
        { status: 201 },
      );
    } catch (error) {
      console.error("[imports.upload] Failed to upload file", error);
      const message = error instanceof Error ? error.message : "Failed to upload file.";
      return NextResponse.json({ error: message }, { status: 500 });
    }
  });
}

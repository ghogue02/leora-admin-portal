/**
 * POST /api/scan/license
 *
 * Upload and scan a liquor license image using the OpenAI vision flow.
 * Returns immediately with scanId for async status polling.
 *
 * Request: multipart/form-data
 *   - image: File (JPEG, PNG, WebP, max 5MB)
 *   - tenantId: string
 *   - userId: string
 *
 * Response: { scanId: string, status: 'processing' }
 *
 * Workflow:
 *   1. Upload image to Supabase Storage
 *   2. Create ImageScan record
 *   3. Enqueue job for OpenAI extraction via Supabase
 *   4. Return scanId immediately (non-blocking)
 *   5. Client polls GET /api/scan/{scanId} for results
 */

import { NextRequest, NextResponse } from "next/server";
import { uploadImageToSupabase } from "@/lib/storage";
import { enqueueJob } from "@/lib/job-queue";
import { withSalesSession } from "@/lib/auth/sales";

export async function POST(request: NextRequest) {
  return withSalesSession(request, async ({ db, tenantId, session }) => {
    try {
      const formData = await request.formData();
      const image = formData.get("image");

      if (!(image instanceof File)) {
        return NextResponse.json({ error: "Image file is required" }, { status: 400 });
      }

      if (!image.type.startsWith("image/")) {
        return NextResponse.json({ error: "File must be an image" }, { status: 400 });
      }

      const imageUrl = await uploadImageToSupabase(image, tenantId, "liquor_license");

      const scan = await db.imageScan.create({
        data: {
          tenantId,
          userId: session.user.id,
          imageUrl,
          scanType: "liquor_license",
          status: "processing",
          extractedData: {},
        },
      });

      await enqueueJob("image_extraction", {
        scanId: scan.id,
        imageUrl,
        scanType: "liquor_license",
      });

      return NextResponse.json({
        scanId: scan.id,
        status: "processing",
        message: "License scan initiated. Poll /api/scan/{scanId} for results.",
      });
    } catch (error) {
      console.error("[scan/license] Scan failed:", error);
      return NextResponse.json(
        { error: error instanceof Error ? error.message : "Scan failed" },
        { status: 500 },
      );
    }
  });
}

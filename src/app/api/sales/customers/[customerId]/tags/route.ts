import { NextRequest, NextResponse } from "next/server";
import { withSalesSession } from "@/lib/auth/sales";

/**
 * POST /api/sales/customers/[customerId]/tags
 * Add a tag to a customer
 */
export async function POST(
  request: NextRequest,
  context: { params: Promise<{ customerId: string }> }
) {
  return withSalesSession(request, async ({ db, tenantId }) => {
    try {
      const { customerId } = await context.params;
      const body = await request.json();
      const { tagType, tagValue } = body;

      if (!tagType) {
        return NextResponse.json(
          { error: "tagType is required" },
          { status: 400 }
        );
      }

      // Verify customer exists and belongs to tenant
      const customer = await db.customer.findUnique({
        where: {
          id: customerId,
          tenantId,
        },
      });

      if (!customer) {
        return NextResponse.json(
          { error: "Customer not found" },
          { status: 404 }
        );
      }

      // Check if tag already exists for this customer
      const existingTag = await db.$queryRaw`
        SELECT * FROM "CustomerTag"
        WHERE "tenantId" = ${tenantId}::uuid
        AND "customerId" = ${customerId}::uuid
        AND "tagType" = ${tagType}
        AND ("tagValue" = ${tagValue} OR ("tagValue" IS NULL AND ${tagValue}::text IS NULL))
        AND "removedAt" IS NULL
      `;

      if (Array.isArray(existingTag) && existingTag.length > 0) {
        return NextResponse.json(
          { error: "Tag already exists for this customer" },
          { status: 409 }
        );
      }

      // Create the tag
      await db.$executeRaw`
        INSERT INTO "CustomerTag" ("id", "tenantId", "customerId", "tagType", "tagValue", "addedAt")
        VALUES (gen_random_uuid(), ${tenantId}::uuid, ${customerId}::uuid, ${tagType}, ${tagValue}, NOW())
        RETURNING *
      `;

      // Fetch the created tag
      const createdTag = await db.$queryRaw`
        SELECT * FROM "CustomerTag"
        WHERE "tenantId" = ${tenantId}::uuid
        AND "customerId" = ${customerId}::uuid
        AND "tagType" = ${tagType}
        AND "removedAt" IS NULL
        ORDER BY "addedAt" DESC
        LIMIT 1
      `;

      return NextResponse.json({
        tag: Array.isArray(createdTag) ? createdTag[0] : createdTag,
      });
    } catch (error) {
      console.error("Error creating customer tag:", error);
      return NextResponse.json(
        { error: "Failed to create tag" },
        { status: 500 }
      );
    }
  });
}

/**
 * GET /api/sales/customers/[customerId]/tags
 * Get all active tags for a customer
 */
export async function GET(
  request: NextRequest,
  context: { params: Promise<{ customerId: string }> }
) {
  return withSalesSession(request, async ({ db, tenantId }) => {
    try {
      const { customerId } = await context.params;

      // Verify customer exists and belongs to tenant
      const customer = await db.customer.findUnique({
        where: {
          id: customerId,
          tenantId,
        },
      });

      if (!customer) {
        return NextResponse.json(
          { error: "Customer not found" },
          { status: 404 }
        );
      }

      // Get all active tags for the customer
      const tags = await db.$queryRaw`
        SELECT
          "id",
          "tagType",
          "tagValue",
          "addedAt"
        FROM "CustomerTag"
        WHERE "tenantId" = ${tenantId}::uuid
        AND "customerId" = ${customerId}::uuid
        AND "removedAt" IS NULL
        ORDER BY "tagType", "addedAt" DESC
      `;

      return NextResponse.json({
        tags: tags || [],
      });
    } catch (error) {
      console.error("Error fetching customer tags:", error);
      return NextResponse.json(
        { error: "Failed to fetch tags" },
        { status: 500 }
      );
    }
  });
}

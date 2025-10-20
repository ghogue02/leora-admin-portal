import { NextRequest, NextResponse } from "next/server";
import { withAdminSession, AdminSessionContext } from "@/lib/auth/admin";

/**
 * GET /api/admin/suppliers
 * Get all suppliers for tenant
 */
export async function GET(request: NextRequest) {
  return withAdminSession(request, async (context: AdminSessionContext) => {
    const { tenantId, db } = context;
    try {
      const suppliers = await db.supplier.findMany({
        where: { tenantId },
        orderBy: { name: "asc" },
      });

      return NextResponse.json({
        suppliers: suppliers.map((s) => ({
          id: s.id,
          name: s.name,
          externalId: s.externalId,
        })),
      });
    } catch (error) {
      console.error("Error fetching suppliers:", error);
      return NextResponse.json({ error: "Failed to fetch suppliers" }, { status: 500 });
    }
  });
}

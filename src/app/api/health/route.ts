import { NextRequest, NextResponse } from "next/server";
import { summarizeHealth } from "@/lib/observability/health-summary";
import { getOperationalSnapshot } from "@/lib/observability/status";
import { getDefaultTenantSlug, requireTenantBySlug } from "@/lib/tenant";

export async function GET(request: NextRequest) {
  try {
    const slugParam = request.nextUrl.searchParams.get("tenant");
    const resolvedSlug = slugParam ?? getDefaultTenantSlug();
    const tenant = await requireTenantBySlug(resolvedSlug);

    const snapshot = await getOperationalSnapshot({
      tenantId: tenant.id,
      tenantSlug: tenant.slug,
    });

    const summary = summarizeHealth(snapshot);

    return NextResponse.json(
      {
        status: summary.status,
        generatedAt: summary.generatedAt,
        tenant: { id: tenant.id, slug: tenant.slug },
        components: summary.components,
        release: summary.release,
      },
      {
        status: summary.status === "error" ? 503 : 200,
        headers: {
          "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
        },
      },
    );
  } catch (error) {
    console.error("[health] endpoint failed", error);
    return NextResponse.json(
      {
        status: "error",
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}

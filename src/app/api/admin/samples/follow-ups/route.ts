import { NextRequest, NextResponse } from "next/server";
import { withAdminSession } from "@/lib/auth/admin";
import {
  getFollowUpAutomationStatus,
  runFollowUpAutomation,
} from "@/lib/samples/follow-up-automation";

export async function GET(request: NextRequest) {
  return withAdminSession(request, async ({ db }) => {
    const tenantId = request.nextUrl.searchParams.get("tenantId") ?? undefined;
    const status = await getFollowUpAutomationStatus(db, tenantId);
    return NextResponse.json({ status });
  });
}

export async function POST(request: NextRequest) {
  return withAdminSession(request, async ({ db }) => {
    const body = await request.json().catch(() => ({}));
    const tenantId = typeof body?.tenantId === "string" ? body.tenantId : undefined;
    const result = await runFollowUpAutomation(db, { tenantId });
    return NextResponse.json({ result });
  });
}

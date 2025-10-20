import { NextRequest, NextResponse } from "next/server";
import { clearSalesSessionCookies, readSalesSessionCookies } from "@/lib/auth/sales-cookies";
import { deleteSalesSession } from "@/lib/auth/sales-session";
import { db } from "@/lib/prisma";

export async function POST(request: NextRequest) {
  const { sessionId } = readSalesSessionCookies(request);

  if (sessionId) {
    await deleteSalesSession(db, sessionId);
  }

  const response = NextResponse.json({ success: true });
  clearSalesSessionCookies(response);
  return response;
}

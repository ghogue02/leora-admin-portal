import { NextRequest, NextResponse } from "next/server";
import { readSalesSessionCookies } from "@/lib/auth/sales-cookies";

export async function GET(request: NextRequest) {
  const { sessionId, refreshToken } = readSalesSessionCookies(request);

  // Get all cookies
  const allCookies = request.cookies.getAll();

  // Get all headers
  const headers: Record<string, string> = {};
  request.headers.forEach((value, key) => {
    headers[key] = value;
  });

  return NextResponse.json({
    timestamp: new Date().toISOString(),
    sessionId: sessionId ? `${sessionId.substring(0, 12)}...` : null,
    refreshToken: refreshToken ? `${refreshToken.substring(0, 12)}...` : null,
    allCookies: allCookies.map(c => ({
      name: c.name,
      valuePreview: c.value.substring(0, 12) + '...',
    })),
    headers: {
      cookie: headers['cookie'] ? 'present' : 'missing',
      'x-tenant-id': headers['x-tenant-id'] ?? 'missing',
      'x-tenant-slug': headers['x-tenant-slug'] ?? 'missing',
      host: headers['host'],
      origin: headers['origin'] ?? 'missing',
      referer: headers['referer'] ?? 'missing',
    },
    cookieCount: allCookies.length,
  });
}
